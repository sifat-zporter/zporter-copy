import { Body, Controller, Delete, Get, HttpStatus, Param, ParseArrayPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiHeaders, ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CoachOrAdminGuard } from "../../auth/guards/coach-admin-auth.guard";
import { ResponseMessage } from "../../common/constants/common.constant";
import { EventsService } from "./calendar.service";
import { EventCommentDto, GetEventCommentListDto, ResponseCommentDto } from "./dto/comment.dto";
import { UpdateEventEvaluationDto } from "./dto/event-evaluations.dto";
import { UserAttendanceDto, UserStatusDto } from "./dto/event-participants.dto";
import { GetEventCommentDto, GetEventsList, GetMonthlyEventsList, GetMultipleEventsDto, GetSingleEventDto } from "./dto/get-event.dto";
import { MatchDto, UpdateMatchDto } from "./dto/match.dto";
import { OtherEventDto, UpdateOtherEventDto } from "./dto/other.dto";
import { ReminderDto, UpdateReminderDto } from "./dto/reminder";
import { TeamTrainingDto, UpdateTeamTrainingDto } from "./dto/team-training.dto";
import { GetInvitationType } from "./enum/event.enum";
import { MatchService } from "./services/match/match.service";
import { OtherService } from "./services/other/other.service";
import { ReminderService } from "./services/reminder/reminder.service";
import { TeamTrainingService } from "./services/team_training/team-training.service";

@ApiBearerAuth()
@UseGuards(CoachOrAdminGuard)
@ApiTags('Calendar Event')
@Controller('events')
@ApiHeaders([
    {
        name: 'roleId',
        description: 'roleId aka user document Id',
    },
])
@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad request' })
@ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'Service unavailable' })

export class CalendarEventController {
    constructor(
        private readonly eventsService: EventsService,
        private readonly reminderService: ReminderService,
        private readonly teamTrainingService: TeamTrainingService,
        private readonly matchService: MatchService,
        private readonly otherService: OtherService
    ) { }

    @Post('reminder')
    @ApiOperation({
        summary: `Create Reminder Events`,
        description: `This endpoint allows coach & admin to create reminder events.`,
    })
    @ApiBody({ type: ReminderDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: ResponseMessage.Events.REMINDER.CREATED })
    async createReminder(
        @Req() req: any,
        @Body() payload: ReminderDto): Promise<string> {
        return this.reminderService.createReminder(payload, req);
    }

    @Patch('reminder/:eventId')
    @ApiOperation({
        summary: `Update Reminder event`,
        description: `This endpoint allows update reminder events.`,
    })
    @ApiBody({ type: UpdateReminderDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateReminderEvent(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: UpdateReminderDto): Promise<string> {
        return this.reminderService.updateReminderEvent(eventId, payload, req);
    }

    @Post('team-training')
    @ApiOperation({
        summary: `Create Team Training Events`,
        description: `This endpoint allows coach & admin to create team training events.`,
    })
    @ApiBody({ type: TeamTrainingDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: ResponseMessage.Events.TEAM_TRAINING.CREATED })
    async createTeamTraining(
        @Req() req: any,
        @Body() payload: TeamTrainingDto): Promise<string> {
        return this.teamTrainingService.createTeamTraining(payload, req);
    }

    @Patch('team-training/:eventId')
    @ApiOperation({
        summary: `Update Team Tranining event`,
        description: `This endpoint allows update team training events.`,
    })
    @ApiBody({ type: UpdateTeamTrainingDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateTeamTraining(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: UpdateTeamTrainingDto): Promise<Object> {
        return this.teamTrainingService.updateTeamTraining(eventId, payload, req);
    }

    @Post('match')
    @ApiOperation({
        summary: `Create Match Events`,
        description: `This endpoint allows coach & admin to create match events.`,
    })
    @ApiBody({ type: MatchDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: ResponseMessage.Events.MATCH.CREATED })
    async createMatchEvent(
        @Req() req: any,
        @Body() payload: MatchDto): Promise<string> {
        return this.matchService.createMatchEvent(payload, req);
    }

    @Patch('match/:eventId')
    @ApiOperation({
        summary: `Update Match event`,
        description: `This endpoint allows to update match events.`,
    })
    @ApiBody({ type: UpdateMatchDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateMatchEvent(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: UpdateMatchDto): Promise<string> {
        return this.matchService.updateMatchEvent(eventId, payload, req);
    }

    @Post('other')
    @ApiOperation({
        summary: `Create Other Events`,
        description: `This endpoint allows coach & admin to create other events.`,
    })
    @ApiBody({ type: OtherEventDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: ResponseMessage.Events.CREATED })
    async createOtherEvent(
        @Req() req: any,
        @Body() payload: OtherEventDto): Promise<string> {
        return this.otherService.createOtherEvent(payload, req);
    }

    @Patch('other/:eventId')
    @ApiOperation({
        summary: `Update Other event`,
        description: `This endpoint allows to update other events.`,
    })
    @ApiBody({ type: UpdateOtherEventDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateOtherEvent(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: UpdateOtherEventDto): Promise<Object> {
        return this.otherService.updateOtherEvent(eventId, payload, req);
    }

    @Get('participant/invitation')
    @ApiOperation({
        summary: `Get Invitation List or Count`,
        description: `This endpoint retrieves events list or number of events invited.`,
    })
    @ApiOkResponse({ description: ResponseMessage.Events.FOUND, type: [GetMultipleEventsDto] })
    @ApiQuery({
        name: "type",
        enum: GetInvitationType,
        description: "Type of Data to be returned count or list. Default is list.",
        required: false
    })
    async getInvitationList(
        @Query('type') type: GetInvitationType = GetInvitationType.LIST,
        @Req() req: any): Promise<Object | number> {
        return this.eventsService.getInvitationList(type, req);
    }

    @Get()
    @ApiOperation({
        summary: `Get all events`,
        description: `This endpoint retrieves all events for the admin.`,
    })
    @ApiOkResponse({ description: ResponseMessage.Events.FOUND, type: [GetMultipleEventsDto] })
    async findAll(
        @Req() req: any,
        @Query() getEventsList: GetEventsList): Promise<Object> {
        return this.eventsService.findAllEvents(req, getEventsList);
    }

    @Get(':eventId')
    @ApiOperation({
        summary: `Get Single events`,
        description: `This endpoint retrieves single events.`,
    })
    @ApiOkResponse({ description: ResponseMessage.Events.FOUND, type: GetSingleEventDto })
    async findEventById(
        @Param('eventId') eventId: string,
        @Req() req: any): Promise<Object> {
        return this.eventsService.findEventById(eventId, req);
    }

    @Post('comment/:eventId')
    @ApiOperation({
        summary: `Add Comment on Event`,
        description: `This endpoint allows to add comment on event`,
    })
    @ApiBody({ type: EventCommentDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.COMMENT.ADDED })
    async addComment(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: EventCommentDto): Promise<string> {
        return this.eventsService.addComments(eventId, payload, req);
    }

    @Get('comment/:eventId')
    @ApiOperation({
        summary: `Get events comments`,
        description: `This endpoint retrieves single comments.`,
    })
    @ApiOkResponse({ description: ResponseMessage.Events.FOUND, type: ResponseCommentDto })
    async getEventComments(
        @Query() getEventCommentDto: GetEventCommentDto,
        @Param('eventId') eventId: string,
        @Req() req: any): Promise<Object> {
        return this.eventsService.getEventComments(eventId, getEventCommentDto, req);
    }

    @Get(':month/:year')
    @ApiOperation({
        summary: `Get Events by Month and Year`,
        description: `This endpoint retrieves events by month & year.`,
    })
    @ApiOkResponse({ description: ResponseMessage.Events.FOUND, type: [GetMultipleEventsDto] })
    async findEventByMonthYear(
        @Query() getMonthlyEventsList: GetMonthlyEventsList,
        @Param('month') month: number,
        @Param('year') year: number,
        @Req() req: any): Promise<Object> {
        return this.eventsService.findEventByMonthYear(month, year, getMonthlyEventsList, req);
    }

    @Delete(':eventId')
    @ApiOperation({
        summary: `Delete event`,
        description: `This endpoint allows coach & admin to delete events.`,
    })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.DELETED })
    async deleteEvent(
        @Param('eventId') eventId: string,
        @Req() req: any): Promise<string> {
        return this.eventsService.deleteEvent(eventId, req);
    }

    @Patch('status/:eventId')
    @ApiOperation({
        summary: `Update Status of participant`,
        description: `This endpoint allows to update Status of participant. (Primarily Updated When User Responds to the event Invitation)`,
    })
    @ApiBody({ type: UserStatusDto })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateStatus(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() payload: UserStatusDto): Promise<string> {
        return this.eventsService.updateStatus(eventId, payload, req);
    }

    @Patch('attendance/:eventId')
    @ApiOperation({
        summary: `Update Attendance of participant`,
        description: `This endpoint allows to update Attendance of participant. (Primarily Updated by the Organizer)`,
    })
    @ApiBody({ type: [UserAttendanceDto] })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateAttendance(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body(new ParseArrayPipe({ items: UserAttendanceDto, whitelist: true, forbidNonWhitelisted: true }))
        payload: UserAttendanceDto[]): Promise<string> {
        return this.eventsService.updateAttendance(eventId, payload, req);
    }

    @Patch('evaluate/:eventId')
    @ApiOperation({
        summary: `Evaluate Event Participant `,
        description: `This endpoint allows to update Evaluation of participant. (Primarily Updated by the Organizer)`,
    })
    @ApiBody({ type: [UpdateEventEvaluationDto] })
    @ApiResponse({ status: HttpStatus.OK, description: ResponseMessage.Events.UPDATED })
    async updateEvaluation(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body(new ParseArrayPipe({ items: UpdateEventEvaluationDto, whitelist: true, forbidNonWhitelisted: true }))
        payload: UpdateEventEvaluationDto[]): Promise<string> {
        return this.eventsService.updateEvaluation(eventId, payload, req);
    }
}