import { forwardRef, Inject, Injectable, Request } from "@nestjs/common";
import { ResponseMessage } from "../../../../common/constants/common.constant";
import { db } from "../../../../config/firebase.config";
import { getDocumentsList } from "../../../../helpers/map-documents";
import { NotificationType } from "../../../notifications/dto/notifications.req.dto";
import { NotificationsService } from "../../../notifications/notifications.service";
import { EventsService } from "../../calendar.service";
import { ReminderDto, UpdateReminderDto } from "../../dto/reminder";
import { EventType } from "../../enum/event.enum";

@Injectable()
export class ReminderService {
    constructor(
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => EventsService))
        private eventsService: EventsService,
    ) { }

    async createReminder(payload: ReminderDto, @Request() req: any): Promise<string> {
        const { userId, name, faceImage } = req.user;
        const { title, startDate, untilDate, invitedUsers, sendNotification } = payload;
        console.log('Creating Reminder Event:', invitedUsers);
        const participants = [];

        const reminderPayload: any = {
            ...payload,
            type: EventType.REMINDER,
            organizerId: userId,
            organizerName: name,
            organizerFaceImage: faceImage || '',
            createdAt: new Date().getTime()
        }

        if (startDate) {
            reminderPayload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime();
        }
        if (untilDate) {
            reminderPayload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            reminderPayload.effectiveEndDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
        }

        //Validate Participants
        if (invitedUsers && invitedUsers.length > 0) {
            const userIds = invitedUsers.map(userID => userID.trim()).filter(id => id !== userId) // Exclude the organizer from the list;
            const users = await getDocumentsList(userIds, 'users');
            reminderPayload.invitedUsers = users.map(user => {
                participants.push(user);
                return user.userId;
            }); // Store only valid user IDs
        }

        const savedReminder = await db.collection('events').add(reminderPayload);

        //Add Event Sub Collection for participants and evaluations 
        if (participants?.length > 0) {
            await this.eventsService.addEventSubCollections(savedReminder.id, participants, req);
        }

        //Add Notification for participants
        if (participants.length > 0 && sendNotification) {
            await this.notificationsService.eventParticipants({ id: savedReminder.id, ...reminderPayload }, participants, NotificationType.EVENT_INVITATION, `${name} has added you to the ${title} event.`);
        }
        console.log('Reminder Event Created Successfully:', savedReminder.id);
        return ResponseMessage.Events.REMINDER.CREATED;
    }

    async updateReminderEvent(eventId: string, updateData: UpdateReminderDto, req: any): Promise<string> {
        const { userId, name } = req.user;
        const newParticipants = [];

        const { eventRef, eventData } = await this.eventsService.getEventByID(eventId, { type: 'reminder' }, userId);

        //Update Event Data
        const payload = { ...eventData, ...updateData };
        const { title, startDate, endDate, invitedUsers, untilDate } = payload;
        //Remove Old Participants not in the new list
        const removedParticipants = eventData.invitedUsers ? eventData.invitedUsers.filter((id: string) => !invitedUsers || !invitedUsers.includes(id.trim())) : [];

        if (updateData?.startDate) { payload.startDate = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime(); }

        if (updateData?.untilDate) {
            payload.untilDate = untilDate instanceof Date ? untilDate.getTime() : new Date(untilDate).getTime();
            payload.effectiveEndDate = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime();
        }

        //Check New Participants
        if (invitedUsers && invitedUsers.length > 0) {
            const userIds = invitedUsers.map((user: string) => user.trim()).filter((id: string) => id !== userId);
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

        //Remove Participants Sub Collection excluding the ones that are still in the event
        if (removedParticipants.length > 0) {
            await this.eventsService.removeEventParticipants(eventId, removedParticipants);
            await this.eventsService.removeEventEvaluation(eventId, removedParticipants);
        }

        //Add Notification for if New participants added
        if (newParticipants.length > 0 && payload.sendNotification) {
            await this.notificationsService.eventParticipants({ id: eventId, ...payload }, newParticipants, NotificationType.EVENT_INVITATION, `${name} has added you to the ${title} event.`);
        }

        return ResponseMessage.Events.REMINDER.UPDATED;
    }
}
