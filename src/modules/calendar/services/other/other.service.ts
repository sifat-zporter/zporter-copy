import { forwardRef, Inject, Injectable, Request } from "@nestjs/common";
import { ResponseMessage } from "../../../../common/constants/common.constant";
import { db } from "../../../../config/firebase.config";
import { OtherEventDto, UpdateOtherEventDto } from "../../dto/other.dto";
import { EventType } from "../../enum/event.enum";
import { NotificationsService } from "../../../notifications/notifications.service";
import { getDocumentsList } from "../../../../helpers/map-documents";
import { NotificationType } from "../../../notifications/dto/notifications.req.dto";
import { EventsService } from "../../calendar.service";
import { EventParticipantDto } from "../../dto/event-participants.dto";
import { EventEvaluationsDto } from "../../dto/event-evaluations.dto";

@Injectable()
export class OtherService {
    constructor(
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => EventsService))
        private eventsService: EventsService,
    ) { }

    async createOtherEvent(payload: OtherEventDto, @Request() req: any): Promise<string> {
        const { userId, name, faceImage } = req.user;
        const { title, type, startDate, untilDate, endDate, invitedUsers, sendNotification } = payload;
        const participants = [];

        const otherPayload: any = {
            ...payload,
            organizerId: userId,
            organizerName: name,
            organizerFaceImage: faceImage || '',
            createdAt: new Date().getTime(),
        }

        if (startDate) {
            otherPayload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }
        if (endDate) {
            otherPayload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }
        if (untilDate) {
            otherPayload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            otherPayload.effectiveEndDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
        }
        //Validate Participants
        if (invitedUsers && invitedUsers.length > 0) {
            const userIds = invitedUsers.map(user => user.trim()).filter(id => id !== userId); // Exclude the organizer from the list
            const users = await getDocumentsList(userIds, 'users');
            otherPayload.invitedUsers = users.map(user => {
                participants.push(user);
                return user.userId;
            }); // Store only valid user IDs
        }

        const savedOtherEvent = await db.collection('events').add(otherPayload);

        //Add Event Sub Collection for participants and evaluations 
        if (participants?.length > 0) {
            await this.eventsService.addEventSubCollections(savedOtherEvent.id, participants, req);
        }

        //Add Notification for participants
        if (participants.length > 0 && sendNotification) {
            await this.notificationsService.eventParticipants({ id: savedOtherEvent.id, ...otherPayload }, participants, NotificationType.EVENT_INVITATION, `${name} has invited you to the ${title} event.`);
        }

        const message = ResponseMessage.Events[type.toUpperCase()];
        console.log('Other Event Created Successfully:', savedOtherEvent.id);
        return message.CREATED;
    }

    async updateOtherEvent(eventId: string, updateData: UpdateOtherEventDto, req: any) {
        const { userId, name } = req.user;
        const newParticipants = [];

        const { eventRef, eventData } = await this.eventsService.getEventByID(eventId, {}, userId);

        //Update Event Data
        const payload = { ...eventData, ...updateData };
        const { title, startDate, endDate, untilDate, invitedUsers, type } = payload;

        const removedParticipants = eventData.invitedUsers ? eventData.invitedUsers.filter((id: string) => !invitedUsers || !invitedUsers.includes(id.trim())) : [];

        if (updateData?.startDate) { payload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime(); }
        if (updateData?.endDate) { payload.endDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime(); }
        if (updateData?.untilDate) {
            payload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            payload.effectiveEndDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }

        //Check New Participants
        if (invitedUsers && invitedUsers.length > 0) {
            const userIds = invitedUsers.map((user: string) => user.trim()).filter((id: string) => id !== userId); // Exclude the organizer from the list;
            const users = await getDocumentsList(userIds, 'users');
            payload.invitedUsers = users.map(user => {
                //IF the user is not already in the event participants, add them
                if (!eventData.invitedUsers || !eventData.invitedUsers.includes(user.userId)) {
                    newParticipants.push(user);
                }
                return user.userId
            });
        }

        await eventRef.update(payload);

        //Add Event Sub Collection for participants and evaluations 
        if (newParticipants?.length > 0) {
            await this.eventsService.addEventSubCollections(eventId, newParticipants, req);
        }

        //Remove Participants Sub Collection
        if (removedParticipants.length > 0) {
            await this.eventsService.removeEventParticipants(eventId, removedParticipants);
            await this.eventsService.removeEventEvaluation(eventId, removedParticipants);
        }

        //Add Notification for participants
        if (newParticipants.length > 0 && payload.sendNotification) {
            await this.notificationsService.eventParticipants({ id: eventId, ...payload }, newParticipants, NotificationType.EVENT_INVITATION, `${name} has added you to the ${title} event.`);
        }

        const message = ResponseMessage.Events[type.toUpperCase()];
        return { message: message.UPDATED };
    }
}
