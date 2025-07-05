import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Request } from "@nestjs/common";
import { ResponseMessage } from "../../../../common/constants/common.constant";
import { db } from "../../../../config/firebase.config";
import { getDocumentsList } from "../../../../helpers/map-documents";
import { NotificationType } from "../../../notifications/dto/notifications.req.dto";
import { NotificationsService } from "../../../notifications/notifications.service";
import { EventsService } from "../../calendar.service";
import { MatchDto, UpdateMatchDto } from "../../dto/match.dto";
import { EventType } from "../../enum/event.enum";
import { EventParticipantDto } from "../../dto/event-participants.dto";

@Injectable()
export class MatchService {
    constructor(
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => EventsService))
        private eventsService: EventsService
    ) { }

    async createMatchEvent(payload: MatchDto, @Request() req: any): Promise<string> {
        const { userId, name, isCoach, isAdmin, faceImage } = req.user;
        if (!isCoach && !isAdmin) {
            throw new HttpException(ResponseMessage.Events.NOT_ALLOWED, HttpStatus.UNAUTHORIZED);
        }
        const { title, startDate, endDate, opponentTeamId, opponentClubId, teamInvitations, isSendInviteToOpponent, isSendInvitations } = payload;
        const teamAndClubData: any = {};
        const participants = [];

        const matchPayload: any = {
            ...payload,
            type: EventType.MATCH,
            organizerId: userId,
            organizerName: name,
            organizerFaceImage: faceImage || '',
            createdAt: new Date().getTime()
        }

        //Validate Club & Team
        if (opponentClubId) {
            teamAndClubData.opponentClub = await this.eventsService.validateClub(opponentClubId);
            matchPayload.opponentClub = teamAndClubData.opponentClub;
        }
        if (opponentTeamId) {
            const { teamInfo, members } = await this.eventsService.validateTeam(opponentTeamId, opponentClubId, true);
            if (teamInfo && Object.keys(teamInfo).length > 0) {
                teamAndClubData.opponentTeam = teamInfo;
                matchPayload.opponentTeam = teamInfo;

                const filterOrganizer = members.filter(member => member?.userId && member?.userId !== userId);
                teamAndClubData.opponentTeamMembers = filterOrganizer;
                const opponentTeamPlayersIDs = filterOrganizer.map(member => member?.userId);
                matchPayload.opponentInvitations = opponentTeamPlayersIDs;
            }
        }

        if (startDate) {
            matchPayload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }

        if (endDate) {
            matchPayload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
            matchPayload.effectiveEndDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }

        if (teamInvitations && teamInvitations.length > 0) {
            const { invitedTeams, participantsList } = await this.eventsService.mapTeamInvitations(teamInvitations, userId);
            matchPayload.teamInvitations = invitedTeams;
            participants.push(...participantsList);
        }

        const savedMatch = await db.collection('events').add(matchPayload);

        //Add Event Sub Collection for participants and evaluations 
        if (participants.flat()?.length > 0) {
            await this.eventsService.addEventSubCollections(savedMatch.id, participants, req);
        }

        //Add Notification for participants
        if (participants.flat().length > 0 && isSendInvitations) {
            await this.notificationsService.eventParticipants({ id: savedMatch.id, ...matchPayload }, participants.flat(), NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
        }

        //Add Notification for opponent teams participants
        if (teamAndClubData.opponentTeamMembers && teamAndClubData.opponentTeamMembers.length > 0) {
            await this.eventsService.addEventSubCollections(savedMatch.id, teamAndClubData.opponentTeamMembers, req, { isOpponent: true });
            if (isSendInviteToOpponent) {
                await this.notificationsService.eventParticipants({ id: savedMatch.id, ...matchPayload }, teamAndClubData.opponentTeamMembers, NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
            }
        }
        return ResponseMessage.Events.MATCH.CREATED;
    }

    async updateMatchEvent(eventId: string, updateData: UpdateMatchDto, req: any) {
        const { userId, name } = req.user;
        const newParticipants = [];
        const removedParticipantsIDs = [];
        const allInvitedTeams: any[] = [];
        const teamAndClubData: any = {};
        const { eventRef, eventData } = await this.eventsService.getEventByID(eventId, { type: 'match' }, userId);

        //Update Event Data
        const payload: any = { ...eventData, ...updateData };
        const { title, teamInvitations, isSendInvitations, isSendInviteToOpponent, opponentTeamId, opponentClubId, startDate, endDate } = payload;
        if (updateData?.startDate) {
            payload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }

        if (updateData?.endDate) {
            payload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
            payload.effectiveEndDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }

        //Validate Club & Team
        if (eventData?.opponentTeamId != updateData?.opponentTeamId || eventData?.opponentClubId != updateData?.opponentClubId) {
            const opponentClub = await this.eventsService.validateClub(opponentClubId);
            const { teamInfo, members } = await this.eventsService.validateTeam(opponentTeamId, opponentClubId, true);
            if (eventData?.opponentClubId != updateData?.opponentClubId) {
                payload.opponentClub = opponentClub;
            }
            if (eventData?.opponentTeamId != updateData?.opponentTeamId) {
                const filterOrganizer = members.filter(member => member?.userId !== userId);
                teamAndClubData.opponentTeamMembers = filterOrganizer;
                const opponentTeamPlayersIDs = filterOrganizer.map(member => member?.userId)
                payload.opponentTeam = teamInfo;
                payload.opponentInvitations = opponentTeamPlayersIDs;

                //Remove old opponent team members from event participants and evaluations
                this.eventsService.removeEventParticipants(eventId, eventData?.opponentInvitations || []);
                this.eventsService.removeEventEvaluation(eventId, eventData?.opponentInvitations || []);
            }
        }

        const oldParticipants = eventData.teamInvitations.map((i: { invitedUsers: any; }) => i.invitedUsers).flat();
        const newParticipantsIDs = teamInvitations.map((i: { invitedUsers: any; }) => i.invitedUsers).flat();

        oldParticipants.forEach((userId: string) => {
            if (!newParticipantsIDs.includes(userId)) {
                removedParticipantsIDs.push(userId);
            }
        })

        //Validate Team Invitations. Is User in the Team?
        if (teamInvitations && teamInvitations.length > 0) {
            const { invitedTeams, participantsList } = await this.eventsService.mapTeamInvitations(teamInvitations, userId);
            allInvitedTeams.push(...invitedTeams);
            if (participantsList) {
                participantsList.map((participant: EventParticipantDto) => {
                    if (participant?.userId && !oldParticipants.includes(participant?.userId)) {
                        newParticipants.push(participant);
                    }
                })
            }
        }

        if (allInvitedTeams) {
            payload.teamInvitations = allInvitedTeams;
        }
        await eventRef.update(payload);

        if (newParticipants?.length > 0) {
            await this.eventsService.addEventSubCollections(eventId, newParticipants, req);
        }

        if (eventData?.opponentTeamId != updateData?.opponentTeamId) {
            const opponentTeamMembers = teamAndClubData?.opponentTeamMembers || [];
            if (opponentTeamMembers && opponentTeamMembers.length > 0) {
                await this.eventsService.addEventSubCollections(eventId, opponentTeamMembers, req, { isOpponent: true });
            }
            if (isSendInviteToOpponent) {
                await this.notificationsService.eventParticipants({ id: eventId, ...payload }, opponentTeamMembers, NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
            }
        }

        //Remove Participants Sub Collection
        if (removedParticipantsIDs.length > 0) {
            await this.eventsService.removeEventParticipants(eventId, removedParticipantsIDs);
            await this.eventsService.removeEventEvaluation(eventId, removedParticipantsIDs);
        }

        //Send Notification
        if (newParticipants.length > 0 && isSendInvitations) {
            await this.notificationsService.eventParticipants({ id: eventId, ...payload }, newParticipants, NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
        }

        return ResponseMessage.Events.MATCH.UPDATED;
    }
}
