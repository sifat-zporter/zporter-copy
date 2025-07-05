import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../../../../config/firebase.config';
import {
  PromptTemplatesDto,
  SearchPromptTemplatesDto,
} from '../dto/prompt-templates';
import { UpdatePromptTemplateDto } from '../dto/update-prompt';

@Injectable()
export class PromptTemplatesRepository {
  private readonly collectionName = 'promptTemplates';

  constructor() {
    this.collectionName = 'promptTemplates';
  }

  async create(
    promptTemplate: PromptTemplatesDto,
  ): Promise<PromptTemplatesDto> {
    const id = promptTemplate.id.toLowerCase();
    const checkId = await db.collection(this.collectionName).doc(id).get();

    if (checkId.exists) {
      throw new ConflictException(
        'Prompt template with this ID already exists',
      );
    }

    const promptTemplateRef = db.collection(this.collectionName).doc(id);
    await promptTemplateRef.set({
      ...promptTemplate,
      id,
      createdAt: Date.now(),
    });
    return promptTemplate;
  }

  async findById(id: string): Promise<PromptTemplatesDto> {
    const promptTemplates = await db
      .collection(this.collectionName)
      .doc(id.toLowerCase())
      .get();

    if (!promptTemplates.exists) {
      throw new NotFoundException('Prompt template not found');
    }
    return promptTemplates.data() as PromptTemplatesDto;
  }

  async getPromptTemplates(id: string): Promise<PromptTemplatesDto> {
    return this.findById(id.toLowerCase());
  }

  async update(
    id: string,
    promptTemplate: UpdatePromptTemplateDto,
  ): Promise<PromptTemplatesDto> {
    const checkId = await this.findById(id.toLowerCase());
    if (!checkId) {
      throw new NotFoundException('Prompt template not found');
    }

    await db
      .collection(this.collectionName)
      .doc(id.toLowerCase())
      .update({
        ...promptTemplate,
        updatedAt: Date.now(),
      });

    return {
      ...(checkId as PromptTemplatesDto),
      ...promptTemplate,
      updatedAt: Date.now(),
    };
  }

  async delete(id: string): Promise<any> {
    const checkId = await this.findById(id.toLowerCase());
    if (!checkId) {
      throw new NotFoundException('Prompt template not found');
    }
    await db.collection(this.collectionName).doc(id.toLowerCase()).delete();

    return {
      message: 'Prompt template deleted successfully',
    };
  }

  async search(
    searchPromptTemplatesDto: SearchPromptTemplatesDto,
  ): Promise<PromptTemplatesDto[]> {
    const {
      limit,
      startAfter,
      id,
      name,
      description,
    } = searchPromptTemplatesDto;

    const offset = (startAfter - 1) * limit;

    if (id) {
      const doc = await this.findById(id);
      return doc ? [doc] : [];
    }

    if (name && !description) {
      return this.searchByField('name', name, limit, offset);
    }

    if (description && !name) {
      return this.searchByField('description', description, limit, offset);
    }

    if (name && description) {
      const [nameResults, descResults] = await Promise.all([
        this.searchByField('name', name, limit * 2, 0),
        this.searchByField('description', description, limit * 2, 0),
      ]);

      const nameIds = new Set(nameResults.map((item) => item.id));
      const intersection = descResults
        .filter((item) => nameIds.has(item.id))
        .slice(offset, offset + limit);

      return intersection;
    }

    const query = db
      .collection(this.collectionName)
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as PromptTemplatesDto);
  }

  private async searchByField(
    field: 'name' | 'description',
    searchTerm: string,
    limit: number,
    offset: number,
  ): Promise<PromptTemplatesDto[]> {
    const normalizedTerm = searchTerm.toLowerCase().trim();

    const prefixResults = await this.prefixSearch(
      field,
      normalizedTerm,
      limit,
      offset,
    );

    if (prefixResults.length < limit && normalizedTerm.length >= 3) {
      const additionalResults = await this.containsSearch(
        field,
        normalizedTerm,
        limit - prefixResults.length,
      );

      const existingIds = new Set(prefixResults.map((item) => item.id));
      const uniqueAdditional = additionalResults.filter(
        (item) => !existingIds.has(item.id),
      );

      return [...prefixResults, ...uniqueAdditional];
    }

    return prefixResults;
  }

  private async prefixSearch(
    field: 'name' | 'description',
    searchTerm: string,
    limit: number,
    offset: number,
  ): Promise<PromptTemplatesDto[]> {
    const endTerm = searchTerm + '\uf8ff';

    const query = db
      .collection(this.collectionName)
      .where(field, '>=', searchTerm)
      .where(field, '<=', endTerm)
      .orderBy(field)
      .limit(limit + offset);

    const snapshot = await query.get();
    let results = snapshot.docs
      .map((doc) => doc.data() as PromptTemplatesDto)
      .slice(offset);

    if (results.length < limit) {
      const lowerQuery = db
        .collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .limit(100);

      const lowerSnapshot = await lowerQuery.get();
      const lowerResults = lowerSnapshot.docs
        .map((doc) => doc.data() as PromptTemplatesDto)
        .filter((item) => {
          const fieldValue = (item[field] || '').toLowerCase();
          return fieldValue.startsWith(searchTerm);
        })
        .slice(offset, offset + limit);

      const existingIds = new Set(results.map((item) => item.id));
      const uniqueLowerResults = lowerResults.filter(
        (item) => !existingIds.has(item.id),
      );

      results = [...results, ...uniqueLowerResults].slice(0, limit);
    }

    return results;
  }

  private async containsSearch(
    field: 'name' | 'description',
    searchTerm: string,
    limit: number,
  ): Promise<PromptTemplatesDto[]> {
    const batchSize = Math.min(200, limit * 10);

    const query = db
      .collection(this.collectionName)
      .orderBy('createdAt', 'desc')
      .limit(batchSize);

    const snapshot = await query.get();

    return snapshot.docs
      .map((doc) => doc.data() as PromptTemplatesDto)
      .filter((item) => {
        const fieldValue = (item[field] || '').toLowerCase();
        return fieldValue.includes(searchTerm);
      })
      .slice(0, limit);
  }
}
