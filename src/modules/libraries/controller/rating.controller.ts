import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AbstractController } from '../../abstract/abstract.controller';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { CommonResponse } from '../../abstract/dto/common-response';
import { TargetType } from '../../programs/enums/target.type';
import { VotingRequest } from '../../programs/dtos/voting/voting.request';
import { LibRatingService } from '../service/voting/lib.rating.service';
import { ILibRatingService } from '../service/voting/lib.rating.service.interface';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Vote')
@Controller('voting')
export class LibVotingController extends AbstractController<ILibRatingService> {
  constructor(
    @Inject(LibRatingService)
    private ratingService: ILibRatingService,
  ) {
    super(ratingService);
  }

  @Post('library/:type/:id')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Vote documents`,
  })
  async voting(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Param('type') type: TargetType,
    @Param('id') docId: string,
    @Body() request: VotingRequest,
  ): Promise<CommonResponse<null>> {
    if (!Object.values(TargetType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Program.WRONG_TYPE);
    }
    await this.service.voteDoc(currentUserId, type, docId, request.star);

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }
}
