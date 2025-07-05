import { ApiBearerAuth, ApiHeaders, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LocalAuthGuard } from "../../auth/guards/local-auth.guard";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthorizationAndGetUserId } from "../../common/decorators/authorization.decorator";
import { ZaiService } from "./zai.service";
import { CreateZaiDto } from "./dto/create-user-setting.dto";

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Zai')
@Controller('zai')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class ZaiController {
   constructor(private readonly zaiService: ZaiService){}
  @Get('/zai-user-settings')
  @ApiOperation({
    summary: `Get zai data for current user`,
  })
  getZaiDataForUser(
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.zaiService.getZaiUserData(userRoleId);
  }
  @Post('/zai-user-settings')
  @ApiOperation({
    summary: `create zai data`,
  })
  createZaiData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createZaiDto: CreateZaiDto,
  ) {
    return this.zaiService.createZaiUserData(
      userRoleId,
      createZaiDto,
    );
  }
  @Delete('/zai-user-settings')
  @ApiOperation({
    summary: `Delete zai data for current user`,
  })
  deleteZaiDataForUser(
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.zaiService.deleteZaiUserData(userRoleId);
  }
  @Patch('/zai-user-settings')
  @ApiOperation({
    summary: `Update Zai data for the current user`,
  })
  updateZaiData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() updateZaiDto: Partial<CreateZaiDto>, // Allow partial update
  ) {
    return this.zaiService.updateZaiUserData(userRoleId,  updateZaiDto);
  }

}