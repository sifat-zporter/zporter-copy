import { BadRequestException, Injectable } from '@nestjs/common';
import { ILibRepository } from '../interface/repository.interface';
import { ResponseMessage } from '../../../common/constants/common.constant';

@Injectable()
export class LibValidateService {
  async validateHeadline(
    libRepository: ILibRepository,
    headline: string,
    docId?: string,
  ) {
    let lib: number;
    if (docId) {
      lib = await libRepository.count({
        headline,
        isDeleted: false,
        _id: { $ne: docId },
      });
    } else {
      lib = await libRepository.count({
        headline,
        isDeleted: false,
      });
    }

    if (lib) {
      throw new BadRequestException(ResponseMessage.Library.HEADLINE_EXISTED);
    }
  }
}
