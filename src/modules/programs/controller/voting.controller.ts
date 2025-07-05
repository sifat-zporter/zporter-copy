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
import { IRatingService } from '../service/rating/rating.service.interface';
import { RatingService } from '../service/rating/rating.service';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { TargetType } from '../enums/target.type';
import { VotingRequest } from '../dtos/voting/voting.request';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { CommonResponse } from '../../abstract/dto/common-response';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Vote')
@Controller('voting')
export class VotingController extends AbstractController<IRatingService> {
  constructor(
    @Inject(RatingService)
    private ratingService: IRatingService,
  ) {
    super(ratingService);
  }

  @Post(':type/:id')
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
