import { InjectModel } from '@nestjs/mongoose';
import { AbstractMongoRepository } from '../../abstract/abstract-mongo.repository';
import { CLUB_MODEL } from '../schemas/clubs.schemas';
import { Club } from './club';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { SearchClubDto } from '../dto/search-club.dto';

@Injectable()
export class ClubRepository extends AbstractMongoRepository<Club> {
  constructor(
    @InjectModel(CLUB_MODEL)
    private clubModel: Model<Club>,
  ) {
    super(clubModel);
  }

  async getAll(searchClubDto: SearchClubDto) {
    const { clubName, country, limit = 10, startAfter = 0 } = searchClubDto;
    let match = {};
    if (clubName) {
      match['clubName'] = {
        $regex: clubName,
        $options: 'i',
      };
    }
    if (country) {
      match['country'] = {
        $eq: country,
      };
    }

    return this.clubModel.find(match).limit(limit).skip(startAfter);
  }

  async getClubById(clubId: string) {
    return this.clubModel.findOne({ clubId });
  }
}
