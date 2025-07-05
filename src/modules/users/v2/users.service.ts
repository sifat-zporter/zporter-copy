import { Injectable } from '@nestjs/common';
import { SearchUserDto } from '../dto/search-user.dto';
import { PipelineStage } from 'mongoose';
import { UsersMongoRepository } from '../repositories/users.mongo.repository';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { UserTypes } from '../enum/user-types.enum';

@Injectable()
export class UsersV2Service {
  constructor(private readonly userRepository: UsersMongoRepository) {
    // empty
  }

  // Hot fix 31/10, this function should be update :D
  async findAll(searchUserDto: SearchUserDto) {
    const { name, limit = 10, startAfter = 0 } = searchUserDto;
    const match = {};

    if (name && name !== '') {
      match['fullName'] = {
        $regex: name,
        $options: 'i',
      };
    }

    const query: PipelineStage[] = [
      {
        $match: {
          'profile.firstName': {
            $ne: null,
          },
          userId: {
            $exists: true,
          },
        },
      },
      {
        $sort: {
          'profile.firstName': 1,
        },
      },
      {
        $project: {
          fullName: {
            $concat: ['$profile.firstName', ' ', '$profile.lastName'],
          },
          userId: '$userId',
        },
      },
      {
        $match: match,
      },
      {
        $skip: +startAfter,
      },
      {
        $limit: +limit,
      },
    ];

    const users = await this.userRepository.aggregate(query);

    const result = await Promise.all(
      users.map(async (user) => await mappingUserInfoById(user.userId)),
    );

    return result.filter(Boolean);
  }

  async findByNameAndCountry(searchUserDto: SearchUserDto) {
    const { name, country, limit = 10, startAfter = 0 } = searchUserDto;
    const match = {
      'profile.firstName': {
        $ne: null,
      },
      userId: {
        $exists: true,
      },
      type: UserTypes.PLAYER,
    };

    if (country && country !== '') {
      match['profile.birthCountry.alpha3Code'] = {
        $regex: country,
        $options: 'i',
      };
    }

    const nameMatch = {};
    if (name && name !== '') {
      nameMatch['fullName'] = {
        $regex: name,
        $options: 'i',
      };
    }

    const query: PipelineStage[] = [
      {
        $match: match,
      },
      {
        $sort: {
          'profile.firstName': 1,
        },
      },
      {
        $project: {
          fullName: {
            $concat: ['$profile.firstName', ' ', '$profile.lastName'],
          },
          userId: '$userId',
        },
      },
      {
        $match: nameMatch,
      },
      {
        $skip: +startAfter,
      },
      {
        $limit: +limit,
      },
    ];

    const users = await this.userRepository.aggregate(query);

    const result = await Promise.all(
      users.map(async (user) => {
        const userInfo = await mappingUserInfoById(user.userId);
        return {
          shirtNumber: userInfo?.shirtNumber || null,
          fullName: userInfo.fullName,
          faceImage: userInfo.faceImage,
          country: userInfo.birthCountry,
        };
      }),
    );

    return result.filter(Boolean);
  }
}
