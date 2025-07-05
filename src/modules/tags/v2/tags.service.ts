import { Injectable } from '@nestjs/common';
import { SearchTagDto } from '../dto/search-tag.dto';
import { TagsRepository } from '../tags.repository';
import { CreateTagDto } from '../dto/create-tag.dto';
import { Tags } from '../schemas/tags.schemas';

@Injectable()
export class TagsV2Service {
  constructor(private readonly tagsRepository: TagsRepository) {}

  async findAll(searchTagDto: SearchTagDto) {
    const { query, type } = searchTagDto;

    return this.tagsRepository.customedFind({
      match: {
        type: type,
        name: {
          $regex: query,
          $options: 'i',
        },
      },
    });
  }

  async saveTags(createTagDto: CreateTagDto) {
    const { names, type } = createTagDto;
    const filterTagNamesNotExists = await this.filterDuplicatedTags(names);

    const newTags: Tags[] = filterTagNamesNotExists.map((tagName) => ({
      name: tagName,
      type: type,
    }));

    return this.tagsRepository.save(newTags);
  }

  async filterDuplicatedTags(names: string[]) {
    names = [...new Set(names)];
    const existTags = await this.tagsRepository.getTagsByNames(names);
    const tagsName = existTags.map((tag) => tag.name);

    return names.filter((name) => !tagsName.includes(name));
  }
}
