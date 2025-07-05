import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import {
  Document as MongoDoc,
  Model,
  FilterQuery,
  ClientSession,
} from 'mongoose';
import { DateUtil } from '../../utils/date-util';
import { deleteNullValuesInArray } from '../../utils/delete-null-values-in-array';
import { Pipeline } from './dto/pipeline';
import { PipelineDto } from './dto/pipeline.dto';

export abstract class AbstractMongoRepository<MongoDoc> {
  @Inject(DateUtil)
  protected dateUtil: DateUtil;

  constructor(protected readonly entityModel: Model<MongoDoc>) {}
  /**
   * Create index. Whenever you change the index, you must delete the existed index
   * @param index
   * @param name
   */
  async initIndex<
    T extends {
      [key: string]: 1 | -1;
    },
  >(index: T, name: string): Promise<void> {
    try {
      await this.entityModel.collection.dropIndex(name);
      await this.entityModel.collection.createIndex(index, { name });
    } catch (error) {
      //# Handle error: when having an update of index with the same name.
      if (error.codeName == 'IndexKeySpecsConflict') {
        await this.entityModel.collection.dropIndex(name);
        await this.entityModel.collection.createIndex(index, { name });
      }
    }
  }

  /**
   * Create TTL(time-to-live) for data. Data will be deleted after `expireAfterSeconds` seconds, the count-down time bases on  `fields`.
   *
   * @description just **ONLY** apply expiration on Date `fields`
   * @fields Date
   * @see https://www.mongodb.com/docs/manual/core/index-ttl/
   * @param fields - The field name to create index for.
   * @param name - The index name
   * @param expireAfterSeconds - The time expiration of data (in seconds)
   */
  async initTTL<
    T extends {
      [key: string]: 1 | -1;
    },
  >(fields: T, name: string, expireAfterSeconds: number): Promise<void> {
    try {
      // await this.entityModel.collection.dropIndex(name);
      await this.entityModel.collection.createIndex(fields, {
        name,
        expireAfterSeconds,
      });
    } catch (error) {
      //# Handle error: when having an update of index with the same name.
      if (error.codeName == 'IndexKeySpecsConflict') {
        await this.entityModel.collection.dropIndex(name);
        await this.entityModel.collection.createIndex(fields, {
          name,
          expireAfterSeconds,
        });
      }
    }
  }
  /**
   * Create a new doc in mongo, if at least one document exists in the database throw `BadRequestException`
   * ; otherwise, create a new Document and `return` the new one.
   * @param filterQuery the filter to check doc exists or not.
   * @param doc `MongoDoc` Type of class want to create
   * @returns the new document.
   */
  async create(
    doc: MongoDoc,
    filterQuery?: FilterQuery<MongoDoc>,
  ): Promise<MongoDoc> {
    try {
      const newFilterQuery: FilterQuery<MongoDoc> = filterQuery
        ? { ...filterQuery, isDeleted: false }
        : { ...doc, isDeleted: false };
      const checkExist = await this.entityModel.exists(newFilterQuery);

      if (checkExist == null) {
        const nowTime = this.dateUtil.getNowTimeInMilisecond();
        const newDoc = await this.entityModel.create({
          ...doc,
          updatedAt: nowTime,
        });
        return newDoc;
      } else {
        throw new BadRequestException(`Document existed, create fail!`);
      }
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  /**
   * Update a document if it existed.
   * @param filterQuery `FilterQuery` condition for searching
   * @param updatedDocument the new document will be updated.
   * @returns the document after being updated.
   */
  async update(
    filterQuery: FilterQuery<MongoDoc>,
    updatedDocument: Partial<MongoDoc>,
  ) {
    this.validateObjectId(filterQuery);
    try {
      const checkExist = await this.entityModel.exists(filterQuery);

      if (checkExist == null) {
        throw new NotFoundException(`Document does not exist, update fail!`);
      } else {
        const nowTime = this.dateUtil.getNowTimeInMilisecond();
        const newDoc = await this.entityModel.findOneAndUpdate(filterQuery, {
          ...updatedDocument,
          updatedAt: nowTime,
        });
        return newDoc;
      }
    } catch (error) {
      throw new BadRequestException('Update fail!');
    }
  }

  async createOrUpdate(
    doc: MongoDoc,
    filterQuery: FilterQuery<MongoDoc>,
    session?: any,
  ): Promise<MongoDoc> {
    try {
      const newFilterQuery: FilterQuery<MongoDoc> = filterQuery;
      // Remove _id field from doc to prevent immutable field update
      const { _id, ...docWithoutId } = doc as any;

      const newDoc: MongoDoc = await this.entityModel.findOneAndUpdate(
        newFilterQuery,
        docWithoutId,
        {
          upsert: true,
          new: true,
          session,
        },
      );
      return newDoc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async createOrUpdateMany<
    T extends MongoDoc & { _id: mongoose.Types.ObjectId },
  >(docs: T[], session?: any): Promise<void> {
    try {
      const operations = docs.map((e: T) => {
        return {
          updateOne: {
            filter: {
              _id: e._id.toString(),
            },
            update: {
              $set: JSON.parse(JSON.stringify(e)),
            },
            upsert: true,
          },
        };
      });
      await this.entityModel.bulkWrite(operations, {
        ordered: false,
        session,
      });
    } catch (error) {
      throw new BadRequestException(`${error.message}`);
    }
  }

  /**
   * Delete a document `SOFTLY` if it existed.
   * @param filterQuery `FilterQuery` condition for searching
   * @returns
   */
  async delete(filterQuery: FilterQuery<MongoDoc>): Promise<string> {
    this.validateObjectId(filterQuery);
    try {
      const checkExist = await this.entityModel.exists(filterQuery);

      if (checkExist == null) {
        throw new NotFoundException(`Document does not exist, delete fail!`);
      } else {
        const now = this.dateUtil.getNowTimeInMilisecond();
        const newDoc = await this.entityModel.findOneAndUpdate(filterQuery, {
          isDeleted: true,
          updatedAt: now,
        });
        return 'Delete document successfully!';
      }
    } catch (error) {
      throw new BadRequestException('Delete fail!');
    }
  }

  /**
   * Delete a document `HARD` if it existed.
   * @param filterQuery `FilterQuery` condition for searching
   * @returns
   */
  async deleteHard(filterQuery: FilterQuery<MongoDoc>): Promise<void> {
    this.validateObjectId(filterQuery);
    try {
      await this.entityModel.deleteMany(filterQuery);
      // const checkExist = await this.entityModel.exists(filterQuery);

      // if (checkExist == null) {
      //   throw new NotFoundException(`Document does not exist, delete fail!`);
      // } else {
      //   const now = this.dateUtil.getNowTimeInMilisecond();
      //   const newDoc = await this.entityModel.deleteOne(filterQuery);
      // }
    } catch (error) {
      throw new BadRequestException('Delete fail!');
    }
  }

  async count(entityFilterQuery: FilterQuery<MongoDoc>): Promise<number> {
    return await this.entityModel.count(entityFilterQuery);
  }

  /**
   * Find one element suitable with conditions in @entityFilterQuery
   * @param entityFilterQuery condition for finding
   * @param projection field in result
   * @returns
   */
  async customedFindOne(
    entityFilterQuery: FilterQuery<MongoDoc>,
    projection?: any | null,
  ): Promise<MongoDoc | null> {
    this.validateObjectId(entityFilterQuery);
    try {
      const doc = await this.entityModel.findOne(entityFilterQuery, projection);
      return doc;
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  /**
   * Custom find
   * @param pipelineDto param for generate pipeline:
   * @returns
   */
  async customedFind(pipelineDto: PipelineDto<MongoDoc>): Promise<MongoDoc[]> {
    try {
      const pipeline = this.generatePipelineAggregate(pipelineDto);

      return await this.entityModel.aggregate(
        this.generateAggregateArray(pipeline),
      );
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  /**
   * Create element for using in aggregate.
   * @param pipelineDto param for generate pipeline
   * @returns condition, keySort, limit, skip and project
   */
  generatePipelineAggregate(pipelineDto: PipelineDto<MongoDoc | any>) {
    const { match, project, keySort, page, pageSize } = pipelineDto;

    //# create condition for match
    this.validateObjectId(match as FilterQuery<string>);
    const items = Object.entries(match);
    const condition = this.createCondition(items);

    //# generate pipeline for aggregate
    return {
      condition,
      keySort,
      project,
      limit: page > 0 && pageSize > 0 ? pageSize * (page - 1) + pageSize : 0,
      skip: page > 0 && pageSize > 0 ? pageSize * (page - 1) : 0,
    };
  }

  generateAggregateArray(pipeline: Pipeline) {
    const entries = Object.entries(pipeline).filter((e) => e[1]);
    const aggregateArray: Array<any> = entries.map((e, idx) => {
      switch (e[0]) {
        case 'condition':
          return { $match: { $and: e[1] } };
        case 'keySort':
          return { $sort: e[1] };

        case 'project':
          return { $project: e[1] };

        case 'limit':
          return { $limit: e[1] };

        case 'skip':
          return { $skip: e[1] };

        default:
          break;
      }
    });
    return aggregateArray;
  }

  createCondition(items: [string, any][]) {
    const condition: Array<any> = [];

    deleteNullValuesInArray(items).forEach((item) => {
      if (typeof item[1] == 'number') {
        const newCondition = new Object();
        newCondition[`${item[0]}`] = { $eq: +item[1] };

        condition.push(newCondition);
      } else if (typeof item[1] == 'string' && item[1].trim() != '') {
        const newCondition = new Object();
        newCondition[`${item[0]}`] = { $eq: item[1] };

        condition.push(newCondition);
      } else if (typeof item[1] == 'boolean') {
        const newCondition = new Object();
        newCondition[`${item[0]}`] = { $eq: item[1] };

        condition.push(newCondition);
      } else if (Array.isArray(item[1]) == true) {
        const newCondition = new Object();
        newCondition[`${item[0]}`] = { $in: item[1] };

        condition.push(newCondition);
      }
      //# check if object is ConditionObject
      // else if (Object.keys(item[1]).every(e => operators.includes(e))) {
      else if (item[1] instanceof Object) {
        const newCondition = new Object();
        newCondition[`${item[0]}`] = item[1];

        condition.push(newCondition);
      }
      // These for process the specific/special cases.
      // else if (item[0] == 'ageGroup') {
      //   if (item[1] == AgeGroup.ADULT) {
      //     const thisYear: number = this.dateUtil.getNowDate().getUTCFullYear();
      //     const adultYear: number = thisYear - 20;

      //     condition.push({
      //       $expr: {
      //         $lt: [{ $toInt: '$birthYear' }, adultYear],
      //       },
      //     });
      //   } else {
      //     const [genderCharactor, birthYear] = item[1].split('_');
      //     const gender: GenderTypes =
      //       genderCharactor == 'G' ? GenderTypes.Female : GenderTypes.Male;

      //     condition.push({
      //       birthYear,
      //     });
      //     condition.push({
      //       gender,
      //     });
      //   }
      // }
    });

    return condition;
  }

  isConditionObjectArray(array: any[]): boolean {
    let check = true;
    for (let i = 0; i < array.length; i++) {
      if (array[i].Name != 'ConditionObject') {
        check = false;
        break;
      }
    }
    return check;
  }

  validateObjectId(filterQuery: FilterQuery<MongoDoc>) {
    if (
      filterQuery['_id'] &&
      typeof filterQuery['_id'] === 'string' &&
      !mongoose.Types.ObjectId.isValid(filterQuery['_id'])
    ) {
      throw new BadRequestException('Cast to ObjectId failed!');
    }
  }

  aggregate(entityFilterQuery: any[]) {
    return this.entityModel.aggregate(entityFilterQuery);
  }

  async get(pipelineDto: PipelineDto<MongoDoc>): Promise<MongoDoc[]> {
    try {
      const pipeline = this.generatePipelineAggregate(pipelineDto);

      return await this.entityModel.aggregate(
        this.generateAggregateArray(pipeline),
      );
    } catch (error) {
      throw new BadRequestException(`${error}`);
    }
  }

  async updateWithSession(
    filterQuery: FilterQuery<MongoDoc>,
    updatedDocument: Partial<MongoDoc>,
    session?: ClientSession,
  ): Promise<void> {
    await this.entityModel.updateMany(
      filterQuery,
      {
        $set: {
          ...updatedDocument,
        },
      },
      {
        session: session,
      },
    );
  }
}
