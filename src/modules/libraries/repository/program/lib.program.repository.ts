import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AbstractMongoRepository } from '../../../abstract/abstract-mongo.repository';
import { Program } from '../../../programs/repositories/program/program';
import { ProgramsRepository } from '../../../programs/repositories/program/programs.repository';
import { IProgramsRepository } from '../../../programs/repositories/program/programs.repository.interface';
import { LibraryModel } from '../../enum/library.model';
import { ILibRepository } from '../../interface/repository.interface';

@Injectable()
export class LibProgramRepository
  extends AbstractMongoRepository<Program>
  implements ILibRepository
{
  constructor(
    @Inject(ProgramsRepository)
    public readonly sourceRepository: IProgramsRepository,
    @InjectModel(LibraryModel.PROGRAM)
    private model: Model<Program>,
  ) {
    super(model);
    const _1MonthSeconds: number = 2592000; // 1 month seconds = 2592000
    this.initTTL(
      {
        deletedAt: 1,
      },
      'TTL-index',
      _1MonthSeconds,
    );
  }

  async getProgramDetailById(id: string) {
    const query: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(id),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'lib_sessions',
          let: {
            programId: '$_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$programId', '$$programId'],
                },
                isDeleted: false,
              },
            },
            {
              $sort: {
                order: 1,
              },
            },
            {
              $lookup: {
                from: 'lib_exercises',
                let: {
                  sessionId: '$_id',
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$sessionId', '$$sessionId'],
                      },
                      isDeleted: false,
                    },
                  },
                  {
                    $sort: {
                      order: 1,
                    },
                  },
                ],
                as: 'exercises',
              },
            },
          ],
          as: 'sessions',
        },
      },
    ];

    const result = await this.model.aggregate(query);
    if (!result.length) {
      return;
    }

    return result[0];
  }
}
