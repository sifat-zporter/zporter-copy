import { SubtypeRequest } from '../../dtos/subtype/subtype.request';
import { SubtypeResponse } from '../../dtos/subtype/subtype.response';
import { TestType } from '../../enums/test-type';

export interface ISubtypeService {
  createSubtype(
    subtypeDto: SubtypeRequest,
    currentUserId: string,
  ): Promise<void>;

  getSubtypeById(subtypeId: string): Promise<SubtypeResponse>;
  getSubtypeByTestType(
    type: TestType,
    page: number,
    pageSize: number,
  ): Promise<SubtypeResponse[]>;

  updateSubtype(
    updateSubtypeDto: SubtypeRequest,
    subtypeId: string,
  ): Promise<void>;

  deleteSubtype(subtypeId: string): Promise<void>;

  validateExistedSubtypeName(
    subtypeName: string,
    testType: TestType,
  ): Promise<void>;
  validateNotFoundSubtype(subtypeId: string): Promise<void>;
}
