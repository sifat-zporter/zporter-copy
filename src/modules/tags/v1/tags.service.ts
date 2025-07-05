import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { elasticClient } from '../../../config/elastic.config';
import { db } from '../../../config/firebase.config';
import { CreateTagDto, CreateTagMongoDto } from '../dto/create-tag.dto';
import { SearchTagResultDto } from '../dto/search-tag-results.dto';
import { SearchTagDto } from '../dto/search-tag.dto';
import { Tags, TAG_MODEL } from '../schemas/tags.schemas';
import { Model } from 'mongoose';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(TAG_MODEL)
    private readonly tagModel: Model<Tags>,
  ) {}

  async saveTags(createTagDto: CreateTagDto): Promise<any> {
    const { names, type } = createTagDto;

    const filterDuplicatedTagNames = await this.filterDuplicatedTags(names);

    // const savePromises = filterDuplicatedTagNames.map(async (name) => {
    //   return db
    //     .collection('tags')
    //     .add({ name, type, createdAt: +moment.utc().format('x') });
    // });
    const savePromises = filterDuplicatedTagNames.map(async (name) => {
      const newTag = { name, type, createdAt: +moment.utc().format('x') };
      return this.tagModel.insertMany({
        ...newTag,
      });
    });

    if (!savePromises.length) {
      return ResponseMessage.Tag.NOTHING_TO_SAVE;
    }

    return Promise.all(savePromises);
  }

  async filterDuplicatedTags(names: string[]): Promise<string[]> {
    const duplicatedTagNames = [] as string[];

    let filteredUniqueNames = [] as string[];

    // check until names.length is spliced completely
    while (names.length) {
      // splice 10 elements of names array with each check
      const batchNames = names.splice(0, 10);

      const existTags = await db
        .collection('tags')
        .where('name', 'in', [...batchNames])
        .get();

      existTags.forEach((tag) => {
        duplicatedTagNames.push(tag.data().name);
      });

      filteredUniqueNames = batchNames.filter((name) => {
        if (!duplicatedTagNames.includes(name)) {
          return name;
        }
      });
    }
    return filteredUniqueNames;
  }

  async findAll(searchTagDto: SearchTagDto): Promise<SearchTagResultDto> {
    const { query, type } = searchTagDto;

    if (query === '') {
      return {
        tags: [],
      };
    }

    // Search for any tags where the text field contains the query text.
    const searchRes = await elasticClient.search({
      index: type.toLowerCase(),
      body: {
        query: {
          query_string: {
            query: `*${query}*`,
            fields: ['name'],
          },
        },
      },
    });

    // Each entry will have the following properties:
    //   _score: a score for how well the item matches the search
    //   _source: the original item data
    const hits = searchRes.body.hits.hits;

    return {
      tags: hits.map((h) => h['_source']),
    };
  }

  async findAllV2(searchTagDto: SearchTagDto) {
    const { query, type } = searchTagDto;

    const tags = await this.tagModel.aggregate([
      {
        $search: {
          index: 'tags_search',
          text: {
            query: `${query} ${type}`,
            path: {
              wildcard: '*',
            },
            fuzzy: {},
          },
        },
      },
    ]);

    return tags;
  }

  async syncTagsToMongo(createTagMongoDto: CreateTagMongoDto) {
    const { tagId } = createTagMongoDto;
    await this.tagModel.findOneAndUpdate(
      {
        tagId: tagId,
      },
      {
        ...createTagMongoDto,
        createdAt: +moment.utc().format('x'),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return createTagMongoDto;
  }
}
