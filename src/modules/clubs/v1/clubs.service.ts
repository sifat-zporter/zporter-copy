/* eslint-disable @typescript-eslint/ban-types */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { elasticClient } from '../../../config/elastic.config';
import { db } from '../../../config/firebase.config';
import { TypeOfPost } from '../../feed/dto/feed.req.dto';
import { FeedService } from '../../feed/feed.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateClubDto } from '../dto/club-data.dto';
import { OutputClubTransferHistories } from '../dto/club.res.dto';
import {
  GetListTeamClubDto,
  GetListTeamClubV2Dto,
} from '../dto/get-list-team.dto';
import { SearchClubDto } from '../dto/search-club.dto';
import { ClubsForMongo, IClubInfo } from '../interfaces/clubs.interface';
import { CLUB_MODEL } from '../schemas/clubs.schemas';
import { Model } from 'mongoose';
import { TEAMS_MODEL } from '../../teams/schemas/team.schema';
import { ITeamDoc } from '../../teams/repositories/teams/team';
import { SortBy } from '../../../common/pagination/pagination.dto';
import { TeamMemberType } from '../../teams/dto/teams.req.dto';

@Injectable()
export class ClubService {
  constructor(
    @InjectModel(CLUB_MODEL)
    private readonly clubModel: Model<ClubsForMongo>,
    @InjectModel(TEAMS_MODEL)
    private readonly teamModel: Model<ITeamDoc>,
    private readonly notificationsService: NotificationsService,
    private readonly feedService: FeedService,
  ) { }

  async createClubTransferHistory(
    oldClubId: string,
    newClubId: string,
    userId: string,
  ) {
    if (oldClubId === newClubId) {
      return;
    }

    const newTransfer = await db.collection('club_transfer_histories').add({
      userId: userId,
      oldClub: oldClubId,
      newClub: newClubId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      typeOfPost: TypeOfPost.TRANSFERS,
    });

    return this.feedService.synchronizePostsToMongoose({
      postId: newTransfer.id,
      typeOfPost: TypeOfPost.TRANSFERS,
    });
  }

  async createClub(
    ip: string,
    currentUserId: string,
    createClubDto: CreateClubDto,
  ) {
    const userRef: FirebaseFirestore.DocumentReference = db.doc(
      `/users/${currentUserId}`,
    );

    const newClubFb = await db.collection('clubs').add({
      ...createClubDto,
      createdBy: currentUserId,
      userRef: userRef,
      ipAddress: ip,
      isVerified: false,
      isApproved: false,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });
    await this.clubModel.findOneAndUpdate(
      {
        clubId: newClubFb.id,
      },
      {
        ...createClubDto,
        clubId: newClubFb.id,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return this.getClubById(newClubFb.id);
  }

  async getClubInfo(transferId: string): Promise<OutputClubTransferHistories> {
    const transferRef = await db
      .collection('club_transfer_histories')
      .doc(transferId)
      .get();

    const { oldClub, newClub, userId, createdAt, updatedAt } =
      transferRef.data();

    const [oldClubInfo, newClubInfo] = await Promise.all([
      db.collection('clubs').doc(oldClub).get(),
      db.collection('clubs').doc(newClub).get(),
    ]);

    return {
      transferInfo: {
        oldClub: {
          clubName: oldClubInfo.data()?.clubName || 'N/A',
          clubLogo: oldClubInfo.data()?.logoUrl || process.env.ZPORTER_IMAGE,
          from: '?',
          to: '?',
        },
        newClub: {
          clubName: newClubInfo.data()?.clubName || 'N/A',
          clubLogo: newClubInfo.data()?.logoUrl || process.env.ZPORTER_IMAGE,
          from: '?',
          to: '?',
        },
        transferFee: '?',
      },
      userId: userId,
      createdAt: createdAt,
      updatedAt: updatedAt,
      transferId: transferRef.id,
    };
  }

  async findAll(searchClubDto: SearchClubDto): Promise<any> {
    const { clubName, country, limit, startAfter } = searchClubDto;
    const conditions = this.generateConditionForClub(clubName, country);

    const params: Object = {
      index: 'clubs',
      body: {
        query: {
          bool: {
            must: conditions,
          },
        },
      },
    };

    if (!startAfter) {
      params['size'] = limit;
    }

    if (startAfter) {
      params['size'] = limit;
      params['from'] = startAfter;
    }

    if (params['size'] > 10000) {
      params['size'] = 10000;
    }

    const searchRes = await elasticClient.search(params);

    const hits = searchRes.body.hits.hits;
    const results = hits.map((hit) => {
      hit._source.clubId = hit._id;
      return hit._source;
    });

    return results;
  }

  async findAllForCMS(
    searchClubDto: SearchClubDto,
  ): Promise<{ body: any; totalPage: number }> {
    const { clubName, country, limit, startAfter } = searchClubDto;

    const conditions = this.generateConditionForClub(clubName, country);

    const params: Object = {
      index: 'clubs',
      body: {
        query: {
          bool: {
            must: conditions,
          },
        },
      },
    };

    if (!startAfter) {
      params['size'] = limit;
    }

    if (startAfter) {
      params['size'] = limit;
      params['from'] = startAfter;
    }

    if (params['size'] > 10000) {
      params['size'] = 10000;
    }

    const searchRes = await elasticClient.search(params);

    const hits = searchRes.body.hits.hits;
    const results = hits.map((hit) => {
      hit._source.clubId = hit._id;
      return hit._source;
    });

    const response = await elasticClient.count({
      index: 'clubs',
      body: {
        query: {
          bool: {
            must: conditions,
          },
        },
      },
    });
    const numPages: number = Math.ceil(response.body.count / limit);

    return {
      body: results,
      totalPage: numPages,
    };
  }

  generateConditionForClub(clubName: string, country: string) {
    const pattern = /([\!\*\+\-\=\<\>\&\|\(\)\[\]\{\}\^\~\?\:\\/"])/g;
    const conditions: any[] = [];

    if (clubName) {
      const searchQuery = clubName.replace(pattern, '\\$1');
      conditions.push({
        query_string: {
          query: `*${searchQuery}*`,
          fields: ['clubName'],
        },
      });
    }

    if (country) {
      const searchQueryCountry = country?.replace(pattern, '\\$1');
      conditions.push({
        query_string: {
          query: `*${searchQueryCountry}*`,
          fields: ['country'],
        },
      });
    }
    return conditions;
  }

  async findAllV2(searchClubDto: SearchClubDto): Promise<any> {
    const { clubName, limit: limitDto, startAfter: page } = searchClubDto;
    const limit = limitDto > 1000 ? 1000 : limitDto;

    if (clubName) {
      const searchClubName = clubName.normalize('NFC');
      const clubs = await this.clubModel.aggregate([
        {
          $search: {
            index: 'clubs_search',
            text: {
              query: searchClubName,
              path: 'clubName',
              fuzzy: {},
            },
          },
        },
        { $skip: +page },
        { $limit: +limit + limit * page },
      ]);

      return clubs;
    } else {
      const clubs = await this.clubModel
        .find()
        .sort({ clubName: 1 })
        .skip(+page)
        .limit(+limit + limit * page);

      return clubs;
    }
  }

  async getListTeamOfClub(getListTeamClubDto: GetListTeamClubDto) {
    const { clubId, searchQuery, limit, startAfter, sorted } =
      getListTeamClubDto;

    let teamRef = db.collection('teams').orderBy('teamName', sorted || 'asc');

    if (clubId && clubId !== TeamMemberType.ALL) {
      teamRef = teamRef.where('clubId', '==', clubId);
    }

    if (searchQuery) {
      teamRef = teamRef.where(
        'teamNameAsArray',
        'array-contains',
        searchQuery.replace(' ', '').toLowerCase(),
      );
    }

    if (startAfter) {
      teamRef = teamRef.offset(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      teamRef = teamRef.limit(+limit);
    }

    const teamSnapshots = await teamRef.get();

    const teams = teamSnapshots.docs.map((doc) => {
      const teamData = doc.data();

      delete teamData?.clubRef;
      delete teamData?.pendingMembers;
      delete teamData?.members;

      delete teamData?.pendingOwners;
      delete teamData?.owners;

      delete teamData?.pendingAdmins;
      delete teamData?.admins;

      return {
        teamId: doc.id,
        ...teamData,
      };
    });

    return teams;

    // if (
    //   userType === UserTypes.COACH &&
    //   ![GenderTypes.LGBT, GenderTypes.Other].includes(gender)
    // ) {
    //   const teamNames =
    //     gender === GenderTypes.Male ? teamNamesForMen : teamNamesForWomen;

    //   const checkingTeamNamesExist = teamNames.map(async (teamName) => {
    //     let teamId: string;
    //     const teamRef = await db
    //       .collection('teams')
    //       .where('teamName', '==', teamName)
    //       .where('clubId', '==', clubId)
    //       .get();

    //     if (!teamRef.empty) {
    //       teamRef.forEach((doc) => {
    //         teamId = doc.id;
    //       });
    //     }

    //     return {
    //       teamName,
    //       teamId: teamRef.empty ? null : teamId,
    //       isCreated: teamRef.empty ? false : true,
    //     };
    //   });

    //   const result = await Promise.all(checkingTeamNamesExist);

    //   return result;
    // }
  }

  async getListTeamOfClubV2(getListTeamClubDto: GetListTeamClubV2Dto) {
    const { clubId, searchQuery, cursor, sorted } = getListTeamClubDto;
    const limit = +getListTeamClubDto.limit || 10;

    const query: Record<string, any> = {};

    if (clubId || searchQuery || cursor) {
      query.$and = [];
    }

    if (clubId) {
      query.$and.push({ clubId });
    }

    if (searchQuery) {
      query.$and.push({
        name: {
          $regex: searchQuery,
          $options: 'i',
        },
      });
    }

    const cloneQueryForTotal = JSON.parse(JSON.stringify(query));

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const comparisonOperator = sorted === SortBy.DESC ? '$lte' : '$gte';

      query.$and.push({
        name: {
          [comparisonOperator]: decodedCursor,
        },
      });
    }

    const [teams, total] = await Promise.all([
      this.teamModel
        .find(query)
        .sort({ name: sorted === SortBy.DESC ? -1 : 1 })
        .limit(limit + 1)
        .select({ users: 0 }),
      this.teamModel.count(cloneQueryForTotal),
    ]);

    let nextCursor = null;
    let hasNextPage = false;

    if (teams.length > limit) {
      nextCursor = Buffer.from(teams[teams.length - 1]?.name).toString(
        'base64',
      );
      hasNextPage = true;
    }

    return {
      data: teams.slice(0, limit),
      total,
      nextCursor,
      hasNextPage,
    };
  }

  async getClubById(clubId: string): Promise<IClubInfo> {
    try {
      const clubDoc = await db.collection('clubs').doc(clubId).get();

      const clubData = {
        clubId: clubDoc?.id,
        clubName: clubDoc.data()?.clubName || 'Zporter Club',
        logoUrl: clubDoc.data()?.logoUrl || process.env.ZPORTER_IMAGE,
        ...clubDoc.data(),
      };

      return clubData;
    } catch (error) {
      return null;
    }
  }
  async getClubByIdFromMongo(clubId: string) {
    const clubDoc = await this.clubModel.findOne({ clubId });

    const clubData = {
      clubId: clubDoc?.clubId,
      clubName: clubDoc?.clubName || 'Zporter Club',
      logoUrl: clubDoc?.logoUrl || process.env.ZPORTER_IMAGE,
      ...clubDoc,
    };
    return clubData;
  }

  async syncClubsToMongo(createClubDto: CreateClubDto) {
    const { clubId, clubName } = createClubDto;

    const clubNameNormalize = clubName.normalize('NFC');

    await this.clubModel.findOneAndUpdate(
      {
        clubId: clubId,
      },
      {
        ...createClubDto,
        clubName: clubNameNormalize,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return createClubDto;
  }

  async deleteClubsToMongo(clubId: string) {
    await this.clubModel.findOneAndDelete({ clubId });
    return 'success';
  }

  async updateClub(clubId: string, updateClubDto: CreateClubDto) {
    try {
      const club = await db.collection('clubs').doc(clubId).get();
      if (!club.exists) {
        throw new NotFoundException(`Not found club`);
      }
      await db
        .collection('clubs')
        .doc(clubId)
        .update({ ...updateClubDto });
      return 'success';
    } catch (error) {
      throw error;
    }
  }

  async deleteClub(userId: string, clubId: string) {
    try {
      const club = await db.collection('clubs').doc(clubId).get();
      if (!club.exists) {
        throw new NotFoundException(`Not found club`);
      }

      await db.collection('clubs').doc(clubId).delete();
      return 'success';
    } catch (error) {
      throw new NotFoundException(`Not found club`);
    }
  }

  // async crawlData(page: puppeteer.Page, url: string) {
  //   try {
  //     await page.goto(url);

  //     // City
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[1]/td[2]',
  //     );
  //     const [el1] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[1]/td[2]',
  //     );
  //     const cityData = await el1.getProperty('textContent');
  //     const city = await cityData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Region
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[2]/td[2]',
  //     );
  //     const [el2] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[2]/td[2]',
  //     );
  //     const regionData = await el2.getProperty('textContent');
  //     const region = await regionData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     //Arena
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[3]/td[2]',
  //     );
  //     const [el3] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[3]/td[2]',
  //     );
  //     const arenaData = await el3.getProperty('textContent');
  //     const arena = await arenaData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Full name
  //     await page.waitForXPath('//*[@id="contenttable"]/tbody/tr[1]/td/h2');
  //     const [el4] = await page.$x('//*[@id="contenttable"]/tbody/tr[1]/td/h2');
  //     const fullNameData = await el4.getProperty('textContent');
  //     const clubName = await fullNameData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Founded In
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[5]/td[2]',
  //     );
  //     const [el5] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[5]/td[2]',
  //     );
  //     const foundedInData = await el5.getProperty('textContent');
  //     const foundedIn = await foundedInData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // District
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[6]/td[2]',
  //     );
  //     const [el6] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[6]/td[2]',
  //     );
  //     const districtData = await el6.getProperty('textContent');
  //     const district = await districtData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Home page
  //     const [homePage] = await Promise.all(
  //       (
  //         await page.$x(
  //           '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[7]/td[2]/a',
  //         )
  //       ).map(
  //         async (item) => await (await item.getProperty('href')).jsonValue(),
  //       ),
  //     );

  //     // Facebook
  //     const [facebook] = await Promise.all(
  //       (
  //         await page.$x(
  //           '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[8]/td[2]/a',
  //         )
  //       ).map(
  //         async (item) => await (await item.getProperty('href')).jsonValue(),
  //       ),
  //     );

  //     // Other information
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[9]/td[2]',
  //     );
  //     const [el9] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[9]/td[2]',
  //     );
  //     const otherInfoData = await el9.getProperty('textContent');
  //     const otherInfo = await otherInfoData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Club admitted
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[10]/td[2]',
  //     );
  //     const [el10] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[10]/td[2]',
  //     );
  //     const clubAdmittedData = await el10.getProperty('textContent');
  //     const clubAdmitted = await clubAdmittedData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Last updated
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[11]/td[2]',
  //     );
  //     const [el11] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[11]/td[2]',
  //     );
  //     const lastUpdatedData = await el11.getProperty('textContent');
  //     const lastUpdated = await lastUpdatedData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     // Logo
  //     await page.waitForXPath(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[2]/table/tbody/tr/td/img[1]',
  //     );
  //     const [el13] = await page.$x(
  //       '//*[@id="infoview"]/table/tbody/tr[1]/td[2]/table/tbody/tr/td/img[1]',
  //     );
  //     const logoData = await el13.getProperty('src');
  //     const logoUrl = await logoData
  //       .jsonValue()
  //       .then((data: string) => data.trim());

  //     const data = {
  //       city,
  //       region,
  //       arena,
  //       clubName,
  //       foundedIn,
  //       district,
  //       homePage,
  //       facebook,
  //       otherInfo,
  //       clubAdmitted,
  //       lastUpdated,
  //       logoUrl,
  //     };
  //     return data;
  //   } catch (error) {
  //     console.log(error.response);
  //   }
  // }

  // async getListActiveClub() {
  //   const clubIds: string[] = [];
  //   for (let i = 1; i <= 144; i++) {
  //     const browser = await puppeteer.launch({ headless: true });
  //     const page = await browser.newPage();

  //     await page.goto(
  //       `http://svenskafotbollsklubbar.se/?page=${i}?page=__page__&grid[search_field]=clubname&grid[search]=&onlyActiveClubs=true`,
  //     );

  //     for (let i = 2; i <= 8; i++) {
  //       await page.waitForXPath(
  //         `//*[@id="search"]/div/table/tbody/tr[${i}]/td[1]`,
  //       );
  //       const [el] = await page.$x(
  //         `//*[@id="search"]/div/table/tbody/tr[${i}]/td[1]`,
  //       );

  //       const clubIdData = await el.getProperty('textContent');
  //       const clubId = await clubIdData
  //         .jsonValue()
  //         .then((data: string) => data.trim());
  //       clubIds.push(clubId);
  //     }
  //     await browser.close();
  //   }
  //   return clubIds;
  // }

  // async saveClubDataToDb() {
  //   const browser = await puppeteer.launch({ headless: false });
  //   const page = await browser.newPage();

  //   for (let i = 0; i < clubIds.length; i++) {
  //     const data = await this.crawlData(
  //       page,
  //       `http://svenskafotbollsklubbar.se/showclub.php?clubid=${clubIds[i]}`,
  //     );
  //     console.log(clubIds[i], data);

  //     if (data?.clubName) {
  //       const clubRef = await db
  //         .collection('clubs')
  //         .where('clubName', '==', data?.clubName)
  //         .get();
  //       if (clubRef.empty) {
  //         await db.collection('clubs').add({
  //           city: data.city === '' || data.city === 'Saknas' ? null : data.city,
  //           country:
  //             data.region === '' || data.region === 'Saknas'
  //               ? null
  //               : data.region,
  //           arena:
  //             data.arena === '' || data.arena === 'Saknas' ? null : data.arena,
  //           clubName: data.clubName,
  //           websiteUrl:
  //             !data.homePage || data.homePage === 'Hemsida saknas'
  //               ? null
  //               : data.homePage,
  //           facebookUrl:
  //             !data.facebook || data.facebook === 'Facebook sida saknas'
  //               ? null
  //               : data.facebook,
  //           logoUrl: data.logoUrl === '' ? null : data.logoUrl,
  //           nickName: '',
  //           order: 0,
  //           parentId: 0,
  //         });
  //       }
  //     }
  //   }
  //   await browser.close();
  // }
}
