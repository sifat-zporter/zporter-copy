import { Injectable } from '@nestjs/common';
import { SearchClubDto } from '../dto/search-club.dto';
import { ClubRepository } from '../repository/club.repository';
import { InjectModel } from '@nestjs/mongoose';
import { CLUB_MODEL } from '../schemas/clubs.schemas';
import { Model } from 'mongoose';
import { Club } from '../repository/club';

@Injectable()
export class ClubV2Service {
  constructor(
    private readonly clubRepository: ClubRepository,
    @InjectModel(CLUB_MODEL)
    private clubModel: Model<Club>,
  ) {}

  async getAllClubs(searchClubDto: SearchClubDto) {
    return this.clubRepository.getAll(searchClubDto);
  }

  async findAllForCMS(
    searchClubDto: SearchClubDto,
  ): Promise<{ body: any; totalPage: number }> {
    const { clubName, country, limit = 10, startAfter = 0 } = searchClubDto;
    const match = {};
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

    const [data, count] = await Promise.all([
      this.clubModel.find(match).limit(limit).skip(startAfter),
      this.clubModel.count(match),
    ]);

    return {
      body: data,
      totalPage: count,
    };
  }
}
