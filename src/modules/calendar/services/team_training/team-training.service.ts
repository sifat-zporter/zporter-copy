import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Request } from "@nestjs/common";
import { ReminderDto } from "../../dto/reminder";
import { db } from "../../../../config/firebase.config";
import { ResponseMessage } from "../../../../common/constants/common.constant";
import { TeamTrainingDto, UpdateTeamTrainingDto } from "../../dto/team-training.dto";
import { EventType } from "../../enum/event.enum";
import { getDocumentsList } from "../../../../helpers/map-documents";
import { NotificationsService } from "../../../notifications/notifications.service";
import { CreateNotificationDto, NotificationType } from "../../../notifications/dto/notifications.req.dto";
import { User } from "../../../users/entities/user.entity";
import { EventsService } from "../../calendar.service";
import { EventParticipantDto } from "../../dto/event-participants.dto";
import { EventEvaluationsDto } from "../../dto/event-evaluations.dto";

@Injectable()
export class TeamTrainingService {
    constructor(
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => EventsService))
        private eventsService: EventsService,
    ) { }

    async createTeamTraining(payload: TeamTrainingDto, @Request() req: any): Promise<string> {
        const { userId, name, isCoach, isAdmin, faceImage } = req.user;
        if (!isCoach && !isAdmin) {
            throw new HttpException(ResponseMessage.Events.NOT_ALLOWED, HttpStatus.UNAUTHORIZED);
        }
        const { title, startDate, endDate, untilDate, teamInvitations, sendNotification } = payload;
        const participants = [];

        const teamTrainingPayload: any = {
            ...payload,
            type: EventType.TEAM_TRAINING,
            organizerId: userId,
            organizerName: name,
            organizerFaceImage: faceImage || '',
            createdAt: new Date().getTime()
        }

        if (startDate) {
            teamTrainingPayload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }
        if (endDate) {
            teamTrainingPayload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }
        if (untilDate) {
            teamTrainingPayload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            teamTrainingPayload.effectiveEndDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
        }

        //Validate Team Invitations. Is User in the Team?
        if (teamInvitations && teamInvitations.length > 0) {
            const { invitedTeams, participantsList } = await this.eventsService.mapTeamInvitations(teamInvitations, userId);
            teamTrainingPayload.teamInvitations = invitedTeams;
            participants.push(...participantsList);
        }

        const savedTeamTraining = await db.collection('events').add(teamTrainingPayload);

        //Add Event Sub Collection for participants and evaluations 
        if (participants.flat()?.length > 0) {
            await this.eventsService.addEventSubCollections(savedTeamTraining?.id, participants, req);
        }

        //Send Notification for participants
        if (participants.flat().length > 0 && sendNotification) {
            await this.notificationsService.eventParticipants({ id: savedTeamTraining?.id, ...teamTrainingPayload }, participants.flat(), NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
        }
        console.log('Team Training Event Created Successfully:', savedTeamTraining?.id);
        return ResponseMessage.Events.TEAM_TRAINING.CREATED;
    }

    async updateTeamTraining(eventId: string, updateData: UpdateTeamTrainingDto, req: any): Promise<string> {
        const { userId, name } = req.user;
        const newParticipants = [];
        const removedParticipantsIDs = [];

        const { eventRef, eventData } = await this.eventsService.getEventByID(eventId, { type: 'team_training' }, userId);
        //Update Event Data
        const payload = { ...eventData, ...updateData };
        const { title, teamInvitations, sendNotification, startDate, endDate, untilDate } = payload;

        if (updateData?.startDate) {
            payload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }
        if (updateData?.endDate) {
            payload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }
        if (updateData?.untilDate) {
            payload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            payload.effectiveEndDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }

        const oldParticipants = eventData.teamInvitations.map((i: { invitedUsers: any; }) => i.invitedUsers).flat().map((i: string) => i && i.trim());
        const newParticipantsIDs = teamInvitations.map((i: { invitedUsers: any; }) => i.invitedUsers).flat().map((i: string) => i && i.trim());

        oldParticipants.forEach((userId: string) => {
            if (!newParticipantsIDs.includes(userId)) {
                removedParticipantsIDs.push(userId);
            }
        })

        //Validate Team Invitations. Is User in the Team?
        if (teamInvitations && teamInvitations.length > 0) {
            const { invitedTeams, participantsList } = await this.eventsService.mapTeamInvitations(teamInvitations, userId);
            payload.teamInvitations = invitedTeams;
            if (participantsList) {
                participantsList.map((participant: EventParticipantDto) => {
                    if (participant?.userId && !oldParticipants.includes(participant?.userId)) {
                        newParticipants.push(participant);
                    }
                })
            }
        }

        await eventRef.update(payload);

        //Add Event Sub Collection for participants and evaluations 
        if (newParticipants?.length > 0) {
            await this.eventsService.addEventSubCollections(eventId, newParticipants, req);
        }

        //Remove Participants Sub Collection
        if (removedParticipantsIDs.length > 0) {
            await this.eventsService.removeEventParticipants(eventId, removedParticipantsIDs);
            await this.eventsService.removeEventEvaluation(eventId, removedParticipantsIDs);
        }

        //Send Notification for participants
        if (newParticipants.length > 0 && sendNotification) {
            await this.notificationsService.eventParticipants({ id: eventId, ...payload }, newParticipants, NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
        }

        return ResponseMessage.Events.TEAM_TRAINING.UPDATED;
    }
}
