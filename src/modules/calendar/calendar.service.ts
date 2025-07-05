import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common';
import * as moment from 'moment';
import { ResponseMessage } from '../../common/constants/common.constant';
import { SortBy } from '../../common/pagination/pagination.dto';
import { db } from '../../config/firebase.config';
import { getDocumentsList } from '../../helpers/map-documents';
import { getBioUrl } from '../../utils/get-bio-url';
import { NotificationType } from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { EventCommentDto } from './dto/comment.dto';
import { EventEvaluationsDto, UpdateEventEvaluationDto } from './dto/event-evaluations.dto';
import { EventParticipantDto, UserAttendanceDto, UserStatusDto } from './dto/event-participants.dto';
import { GetEventCommentDto, GetEventsList, GetMonthlyEventsList } from './dto/get-event.dto';
import { AttendanceStatus, InviteStatus } from './enum/participants.enum';
import { RecurringType } from './enum/event.enum';
import { EventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) { }

  async getEventParticipants(eventId: string, includeUserDetail: Boolean): Promise<EventParticipantDto[]> {
    if (!eventId) { throw new HttpException(`Event Id is required`, HttpStatus.BAD_REQUEST) }

    const eventRef = db.collection('events').doc(eventId);
    const participantsSnapshot = await eventRef.collection('eventParticipants').get();
    if (participantsSnapshot.empty) {
      return [];
    }
    const participants = participantsSnapshot.docs.map(doc => doc.data()) as EventParticipantDto[];

    if (includeUserDetail) {
      const userData = await db.collection('users').where('userId', 'in', participants.map(p => p.userId)).get();
      const users = userData.docs.map(userDoc => userDoc.data());
      const invitedUsersList = await Promise.all(await this.mapUserData(users, participants));
      return invitedUsersList;
    } else {
      return participants;
    }
  }

  async getEventOrganizer(organizerId: string): Promise<any> {
    if (!organizerId) { throw new HttpException(`Organizer Id is required`, HttpStatus.BAD_REQUEST) }

    const userDoc = await db.collection('users').doc(organizerId).get();
    if (!userDoc.exists) { throw new HttpException(ResponseMessage.User.NOT_FOUND, HttpStatus.NOT_FOUND) }
    const userData = userDoc.data();
    const organizer = await this.mapUserData([userData]);
    return organizer[0];
  }

  async getEventByID(eventId: string, conditions: {
    type?: string,
    includeParticipants?: boolean,
    participantsDetails?: boolean,
    includeEvaluations?: boolean,
    includeOrganizer?: boolean,
    mapUserData?: boolean
  } = {}, userId?: string): Promise<{ eventRef: FirebaseFirestore.DocumentReference, eventData: any }> {
    if (!eventId) { throw new HttpException(`Event Id is required`, HttpStatus.BAD_REQUEST) }

    let eventRef = db.collection('events').where('__name__', '==', eventId);
    userId ? (eventRef = eventRef.where('organizerId', '==', userId)) : null;
    conditions?.type ? (eventRef = eventRef.where('type', '==', conditions.type)) : null;

    const eventDoc = await eventRef.get();
    if (eventDoc.empty) {
      throw new HttpException(ResponseMessage.Events.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const eventData = eventDoc.docs[0].data();
    eventData.id = eventDoc.docs[0].id;

    if (conditions?.includeParticipants) {
      eventData.participants = await this.getEventParticipants(eventData?.id, conditions?.participantsDetails);
    }

    if (conditions?.includeEvaluations) {
      const evaluationsSnapshot = await eventDoc.docs[0].ref.collection('eventEvaluations').get();
      eventData.evaluations = evaluationsSnapshot.docs.map(evaluationDoc => evaluationDoc.data());
    }

    if (conditions?.includeOrganizer) {
      const organizer = await this.getEventOrganizer(eventData.organizerId);
      eventData.organizer = organizer;
    }

    const formattedEvent = { ...eventData };

    if ((eventData.type === 'match' || eventData.type === 'team_training') && conditions?.mapUserData) {
      formattedEvent.teamInvitations = eventData.teamInvitations.map((team: any) => {
        const invitedUsers = team.invitedUsers.map((userId: string) => {
          const user = eventData.participants.find((participant: EventParticipantDto) => participant.userId === userId);
          return user ? { ...user } : null;
        });
        return {
          teamInfo: {
            teamId: team.teamInfo.id,
            teamName: team.teamInfo.teamName,
            teamImage: team.teamInfo.teamImage,
          },
          invitedUsers
        }
      });
      if (eventData?.opponentInvitations) {
        const opponentParticipant = eventData.opponentInvitations.map((userId: string) => {
          const user = eventData.participants.find((participant: EventParticipantDto) => participant.userId === userId);
          return user ? { ...user } : null;
        });
        formattedEvent.opponentInvitations = {
          teamInfo: eventData.opponentTeam,
          invitedUsers: opponentParticipant
        }
      }
      delete formattedEvent.participants;
    }
    return { eventRef: eventDoc.docs[0].ref, eventData: formattedEvent };
  }

  async findAllEvents(req: any, getEventsList: GetEventsList) {
    const { userId } = req.user;
    const { visibility, startAfter, startDate, untilDate, limit = 10, sorted = SortBy.DESC, type } = getEventsList;
    const organizer = await this.getEventOrganizer(userId);
    const events = [];

    //Comman query for all events.
    const short = sorted === SortBy.DESC ? 'desc' : 'asc';
    let eventRef = db.collection('events').orderBy('startDate', short).where('organizerId', '==', userId);
    if (type == 'reminder') {
      eventRef = eventRef.where('type', '==', 'reminder');
    } else if (type == 'events') {
      eventRef = eventRef.where('type', '!=', 'reminder');
    }
    if (visibility && visibility !== 'all') {
      eventRef = eventRef.where('isPrivate', '==', visibility === 'private');
    }

    if (startDate) {
      eventRef = eventRef.where('startDate', '>=', new Date(startDate).getTime());
    }
    if (untilDate) {
      eventRef = eventRef.where('effectiveEndDate', '<=', new Date(untilDate).getTime());
    }

    if (startAfter) {
      eventRef = eventRef.startAfter(+startAfter).limit(+limit);
    }
    if (!startAfter) {
      eventRef = eventRef.limit(+limit);
    }

    const eventsSnapshot = await eventRef.get();

    if (!eventsSnapshot.empty) {
      for (const doc of eventsSnapshot.docs) {
        const eventData = doc.data();
        eventData.id = doc.id;
        eventData.participants = await this.getEventParticipants(doc.id, true);
        eventData.organizer = organizer;
        events.push(eventData);
      }
    }

    const formattedEvents = events.map(async event => {
      if (event.type === 'match' || event.type === 'team_training') {
        const eventData = { ...event };
        const participants = event?.participants || [];
        eventData.teamInvitations = event?.teamInvitations.map((team: any) => {
          const invitedUsers = team.invitedUsers.map((userId: string) => {
            const user = participants.find((participant: EventParticipantDto) => participant.userId === userId);
            return user ? { ...user } : null;
          });
          return {
            teamInfo: {
              teamId: team.teamInfo.id,
              teamName: team.teamInfo.teamName,
              teamImage: team.teamInfo.teamImage,
            },
            invitedUsers
          }
        });
        if (eventData?.opponentInvitations) {
          const opponentParticipant = eventData.opponentInvitations.map((userId: string) => {
            const user = eventData.participants.find((participant: EventParticipantDto) => participant.userId === userId);
            return user ? { ...user } : null;
          });
          eventData.opponentInvitations = {
            teamInfo: eventData.opponentTeam,
            invitedUsers: opponentParticipant
          }
        }
        delete eventData.participants;
        if (eventData.recurringType && eventData.recurringType != RecurringType.ONCE && startDate && untilDate) {
          const startDateNum = startDate ? new Date(startDate).getTime() : new Date().getTime();
          const untilDateNum = untilDate ? new Date(untilDate).getTime() : new Date().getTime();
          const duplicateEvents = await this.repeatEvents(eventData, startDateNum, untilDateNum, eventData.startDate, eventData.effectiveEndDate, eventData.recurringType);
          return duplicateEvents;
        }
        return eventData;
      }
      if (event?.recurringType && event?.recurringType != RecurringType.ONCE && untilDate) {
        const startDateNum = startDate ? new Date(startDate).getTime() : new Date().getTime();
        const untilDateNum = untilDate ? new Date(untilDate).getTime() : new Date().getTime();
        const duplicateEvents = await this.repeatEvents(event, startDateNum, untilDateNum, event.startDate, event.effectiveEndDate, event.recurringType);
        return duplicateEvents;
      }
      return event;
    })
    const eventsList = await Promise.all(formattedEvents);
    return eventsList.flat();
  }

  async repeatEvents(event: EventDto, startDate: number, endDate: number, eventStartDate: number, eventEndDate: number, type: RecurringType): Promise<EventDto[]> {

    const events: EventDto[] = [];
    const startMoment = moment(startDate);
    const endMoment = moment(endDate); // Add one day to include the end date
    const eventEndMoment = eventEndDate ? moment(eventEndDate) : null;
    let currentMoment = moment(eventStartDate);
    while (currentMoment.isSameOrBefore(endMoment) && (!eventEndMoment || currentMoment.isSameOrBefore(eventEndMoment))) {
      if (currentMoment.isSameOrAfter(startMoment)) {
        const newEvent: EventDto = {
          ...event,
          startDate: currentMoment.toDate().getTime(),
          endDate: eventEndDate ? currentMoment.clone().add(eventEndDate - eventStartDate, 'milliseconds').toDate().getTime() : null,
          effectiveEndDate: eventEndDate ? currentMoment.clone().add(eventEndDate - eventStartDate, 'milliseconds').toDate().getTime() : null,
        };
        events.push(newEvent);
      }
      if (type === RecurringType.DAILY) {
        currentMoment.add(1, 'days');
      } else if (type === RecurringType.WEEKLY) {
        currentMoment.add(1, 'weeks');
      } else if (type === RecurringType.MONTHLY) {
        currentMoment.add(1, 'months');
      } else if (type === RecurringType.YEARLY) {
        currentMoment.add(1, 'years');
      } else {
        break; // If type is not recognized, stop the loop
      }
    }
    return events;
  }

  async findEventById(eventId: string, req: any) {
    const { userId } = req.user;
    const { eventRef, eventData } = await this.getEventByID(eventId, { includeParticipants: true, includeEvaluations: true, participantsDetails: true, includeOrganizer: true, mapUserData: true });
    return eventData;
  }

  async findEventByMonthYear(month: number, year: number, getMonthlyEventsList: GetMonthlyEventsList, req: any) {
    const { userId } = req.user;
    if ((month < 1 || month > 12) || !month) {
      throw new HttpException(ResponseMessage.Events.INVALID_MONTH, HttpStatus.BAD_REQUEST);
    }
    if (!year) {
      throw new HttpException(ResponseMessage.Events.INVALID_YEAR, HttpStatus.BAD_REQUEST);
    }
    const { limit, sorted, type, visibility } = getMonthlyEventsList;
    const short = sorted === SortBy.DESC ? 'desc' : 'asc';
    const currentMonthDates = new Array(moment(`${year}-${month}`, 'YYYY-MM').daysInMonth()).fill(null).map((x, i) => moment(`${year}-${month}`, 'YYYY-MM').startOf('month').add(i, 'days').format('YYYY-MM-DD')).map(date => new Date(date).getTime());
    let eventRef = db.collection('events').where('organizerId', '==', userId).orderBy('startDate', short);
    if (visibility && visibility !== 'all') {
      eventRef = eventRef.where('isPrivate', '==', visibility === 'private');
    }
    if (type == 'reminder') {
      eventRef = eventRef.where('type', '==', 'reminder');
    } else if (type == 'events') {
      eventRef = eventRef.where('type', '!=', 'reminder');
    }
    // If limit is provided, fetch events for each date in the month
    if (+limit) {
      const eventsPerDate = currentMonthDates.map(async (date) => {
        let eventRefCopy = eventRef;
        eventRefCopy = eventRefCopy.where('startDate', '>=', date);
        eventRefCopy = eventRefCopy.where('startDate', '<=', date + 24 * 60 * 60 * 1000 - 1);
        eventRefCopy = eventRefCopy.limit(+limit);
        const eventsSnapshot = await eventRefCopy.get();
        if (eventsSnapshot.empty) {
          return [];
        }
        const events = [];
        for (const doc of eventsSnapshot.docs) {
          const eventData = doc.data();
          eventData.id = doc.id;
          eventData.startDateISO = new Date(eventData.startDate).toISOString();
          eventData.participants = await this.getEventParticipants(doc.id, true);
          eventData.organizer = await this.getEventOrganizer(eventData.organizerId);
          if (eventData.type === 'match' || eventData.type === 'team_training') {
            const participants = eventData?.participants || [];
            eventData.teamInvitations = eventData?.teamInvitations.map((team: any) => {
              const invitedUsers = team.invitedUsers.map((userId: string) => {
                const user = participants.find((participant: EventParticipantDto) => participant.userId === userId);
                return user ? { ...user } : null;
              });
              return {
                teamInfo: {
                  teamId: team.teamInfo.id,
                  teamName: team.teamInfo.teamName,
                  teamImage: team.teamInfo.teamImage,
                },
                invitedUsers
              }
            });
            if (eventData?.opponentInvitations) {
              const opponentParticipant = eventData.opponentInvitations.map((userId: string) => {
                const user = eventData.participants.find((participant: EventParticipantDto) => participant.userId === userId);
                return user ? { ...user } : null;
              });
              eventData.opponentInvitations = {
                teamInfo: eventData.opponentTeam,
                invitedUsers: opponentParticipant
              }
            }
            delete eventData.participants;
          }
          events.push(eventData);
        }
        return events;
      });
      const events = await Promise.all(eventsPerDate);
      return events.flat();
    } else {
      eventRef = eventRef.where('startDate', '>=', currentMonthDates[0]).where('startDate', '<=', currentMonthDates[currentMonthDates.length - 1] + 24 * 60 * 60 * 1000 - 1);
      const eventsSnapshot = await eventRef.get();
      if (eventsSnapshot.empty) {
        return [];
      }
      const events = [];
      for (const doc of eventsSnapshot.docs) {
        const eventData = doc.data();
        eventData.id = doc.id;
        eventData.participants = await this.getEventParticipants(doc.id, true);
        eventData.organizer = await this.getEventOrganizer(eventData.organizerId);
        if (eventData.type === 'match' || eventData.type === 'team_training') {
          const participants = eventData?.participants || [];
          eventData.teamInvitations = eventData?.teamInvitations.map((team: any) => {
            const invitedUsers = team.invitedUsers.map((userId: string) => {
              const user = participants.find((participant: EventParticipantDto) => participant.userId === userId);
              return user ? { ...user } : null;
            });
            return {
              teamInfo: {
                teamId: team.teamInfo.id,
                teamName: team.teamInfo.teamName,
                teamImage: team.teamInfo.teamImage,
              },
              invitedUsers
            }
          });
          if (eventData?.opponentInvitations) {
            const opponentParticipant = eventData.opponentInvitations.map((userId: string) => {
              const user = eventData.participants.find((participant: EventParticipantDto) => participant.userId === userId);
              return user ? { ...user } : null;
            });
            eventData.opponentInvitations = {
              teamInfo: eventData.opponentTeam,
              invitedUsers: opponentParticipant
            }
          }
          delete eventData.participants;
        }
        events.push(eventData);
      }
      return events;
    }
  }

  async deleteEvent(eventId: string, req: any): Promise<string> {
    const { userId } = req.user;
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new HttpException(
        ResponseMessage.Events.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const eventData = eventDoc.data();
    if (eventData.organizerId !== userId) {
      throw new HttpException(
        ResponseMessage.Events.NOT_FOUND,
        HttpStatus.UNAUTHORIZED,
      );
    }
    await eventRef.delete();
    return ResponseMessage.Events.DELETED;
  }

  async updateStatus(eventId: string, payload: UserStatusDto, req: any) {
    const { userId, name } = req.user;
    const { status, autoAcceptSimilarEvents } = payload;

    const eventRef = db.collection('events').doc(eventId);
    const eventData = (await eventRef.get()).data();
    const participants = [];
    if (eventData?.type === 'match' || eventData?.type === 'team_training') {
      const teamInvitations = eventData?.teamInvitations || [];
      participants.push(...teamInvitations.flatMap((team: { invitedUsers: []; }) => team.invitedUsers));
      if (eventData?.opponentInvitations) {
        participants.push(...eventData.opponentInvitations);
      }
    } else {
      participants.push(...(eventData?.invitedUsers || []));
    }

    if (!participants.includes(userId)) {
      throw new HttpException(ResponseMessage.Events.USER_NOT_PARTICIPANT, HttpStatus.BAD_REQUEST);
    }
    const participantRef = eventRef.collection('eventParticipants').doc(userId);
    const participantDoc = await participantRef.get();
    if (!participantDoc.exists) {
      throw new HttpException(ResponseMessage.Events.PARTICIPANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const participantData = participantDoc.data() as EventParticipantDto;
    const updateData = {
      ...participantData,
      ...payload,
      rsvpAt: new Date().getTime(),
    }
    await participantRef.set(updateData, { merge: true });
    return ResponseMessage.Events.UPDATED_STATUS;
  }

  async updateAttendance(eventId: string, payload: UserAttendanceDto[], req: any) {
    const { userId, name } = req.user;
    const { eventData } = await this.getEventByID(eventId, { includeParticipants: true });
    const { title, organizerId } = eventData;
    const participants: EventParticipantDto[] = eventData?.participants || [];
    const updateUserIDs = payload.map(payload => payload?.userId);
    const participantsToUpdate = participants.filter((participant: EventParticipantDto) => updateUserIDs.includes(participant.userId));
    const notifyIds: string[] = [];
    const notificationDetails: any = [];

    if (participantsToUpdate.length === 0) {
      throw new HttpException(ResponseMessage.Events.NO_USERS_TO_UPDATE, HttpStatus.BAD_REQUEST);
    }

    const updateData = participantsToUpdate.map(async participant => {
      const newAttendanceStatus = payload.find(p => p.userId === participant.userId && (participant?.addedById == userId || p.userId == userId))?.attendanceStatus;
      if (newAttendanceStatus != participant?.attendanceStatus) {
        notifyIds.push(participant.userId);
      }
      return ({
        ...participant,
        attendanceStatus: newAttendanceStatus || participant.attendanceStatus,
        updatedAt: new Date().toISOString(),
      })
    });
    const participantUpdate = await Promise.all(updateData);
    const usersToNotify = await getDocumentsList(notifyIds, 'users');
    usersToNotify.map(user => {
      const participantData = participantUpdate.filter(u => u.userId === user.userId)[0];
      if (user?.settings?.notificationOn && user?.settings?.notificationOptions?.inviteUpdates) {
        notificationDetails.push({
          ...user,
          message: `"${title}" Attendance Status For ${participantData?.name} has been update to ${participantData?.attendanceStatus || AttendanceStatus.PENDING}.`,
        })
      }
    });
    //Add Notification for participants
    if (notificationDetails.length > 0) {
      await this.notificationsService.eventParticipants(eventData, notificationDetails, NotificationType.EVENT_ATTENDANCE_UPDATE, '', true);
    }
    await this.updateEventParticipants(eventId, participantUpdate, req);
    return ResponseMessage.Events.UPDATED_ATTENDANCE_STATUS;
  }

  async updateEvaluation(eventId: string, payload: UpdateEventEvaluationDto[], req: any): Promise<string> {
    const { userId, name } = req?.user;
    const { eventData } = await this.getEventByID(eventId, { includeEvaluations: true }, userId);
    const { title } = eventData;
    const playersEvaluations: EventEvaluationsDto[] = eventData?.evaluations || [];
    const updateUserIDs = payload.map(payload => payload?.userId);
    const playerToUpdate = playersEvaluations.filter((playerEvaluation: EventEvaluationsDto) => updateUserIDs.includes(playerEvaluation.userId));
    const notificationDetails: any = [];

    if (playerToUpdate.length === 0) {
      throw new HttpException(ResponseMessage.Events.NO_USERS_TO_UPDATE, HttpStatus.BAD_REQUEST);
    }

    const updateEvaluationData = playerToUpdate.map(async (player: any) => {
      const playerEvaluation = payload.find(p => p.userId === player.userId);
      return ({
        ...player,
        ...playerEvaluation,
        sharedWithUserAt: new Date().toISOString(),
        evaluationDate: new Date().toISOString(),
        evaluatorId: userId,
        evaluatorName: name
      })
    });

    const newEvaluationData = await Promise.all(updateEvaluationData);
    const usersToNotify = await getDocumentsList(updateUserIDs, 'users');
    usersToNotify.map(user => {
      if (user?.settings?.notificationOn && user?.settings?.notificationOptions?.inviteUpdates) {
        notificationDetails.push({
          ...user,
          message: `Your evaluation for "${title}" has been updated by ${name}.`,
        })
      }
    });

    //Add Notification for participants
    if (notificationDetails.length > 0) {
      await this.notificationsService.eventParticipants(eventData, notificationDetails, NotificationType.EVENT_EVALUATION, '', true);
    }
    await this.updateEventEvaluation(eventId, newEvaluationData, req);
    return ResponseMessage.Events.UPDATED_EVALUATION;
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    if (teamId) {
      const team = await db.collection('teams').doc(teamId).get();
      if (!team.exists) {
        throw new HttpException(ResponseMessage.Events.TEAM_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      const teamData = team.data();
      const teamMemebersGET = teamData.members.map(async (memberRef: { get: () => any; }) => {
        const member = await memberRef.get();
        if (!member.exists) {
          return null; // Skip if user does not exist
        }
        const memberData = member.data();
        return memberData
      });
      const teamMemebers = (await Promise.all(teamMemebersGET)).filter(member => member !== null);
      return teamMemebers;
    }
    return [];
  }

  async mapUserData(userList: any[], otherData?: any[]): Promise<any[]> {
    const invitedUsersList = await Promise.all(userList.map(async user => {
      const { currentHubspotId, username, type, userId, teamIds, isOnline, timezone, lastActive, updatedAt } = user;
      const { country, notificationOn } = user?.settings || {};
      const { birthCountry, birthDay, firstName, lastName, city, gender, age } = user.profile || {};
      const { email, isActive, createdAt } = user?.account || {};
      const { clubId, favoriteRoles, shirtNumber } = user?.playerCareer || {};
      const { currentTeams } = user?.coachCareer || {};
      const { weight, height, fatherHeight, motherHeight } = user?.health || {};
      const { faceImage } = user?.media || {};
      const club = clubId ? await db.collection('clubs').doc(clubId).get() : { data: () => ({ clubName: 'Unknown Club', logoUrl: '' }) };
      const { clubName, logoUrl } = club.data();
      const isPublic = user?.settings?.public || false;
      const fullName = firstName || lastName ? `${firstName} ${lastName}` : 'Unknown User';
      const bioUrl = getBioUrl({
        type: UserTypes[type],
        username,
        firstName: firstName,
        lastName: lastName,
      })
      const userOtherData = otherData && otherData?.length ? otherData?.find((data: { userId: string; }) => data.userId === userId) : {};
      return ({
        email, isActive, birthCountry, fullName, clubId, currentHubspotId, firstName, city, settingCountryRegion: country?.region, settingCountryName: country?.name, favoriteRoles, currentTeams: currentTeams?.map((team: { teamName: any; }) => team.teamName), lastName, faceImage, username, type, userId, teamIds, isOnline, clubName, clubLogoUrl: logoUrl, timezone, lastActive, birthDay, createdAt, updatedAt, shirtNumber, gender, weight: weight?.value, height: height?.value, fatherHeight, motherHeight, age, isPublic, notificationOn, bioUrl,
        ...userOtherData
      });
    }));

    return invitedUsersList.filter(user => user.userId);
  }

  async validateTeam(teamId: string, clubId: string, includeMember?: boolean): Promise<{ teamInfo: {}, members: any[] }> {
    const members = [];
    if (teamId) {
      const teamData = (await db.collection('teams').doc(teamId).get()).data();
      if (!teamData) {
        throw new HttpException(ResponseMessage.Events.TEAM_NOT_FOUND, HttpStatus.NOT_FOUND);
      } else if (teamData.clubId !== clubId && clubId) {
        throw new HttpException(ResponseMessage.Events.TEAM_NOT_BELONG_TO_CLUB, HttpStatus.BAD_REQUEST);
      }
      if (includeMember) {
        const teamMemebersGET = teamData.members.map(async (memberRef: { get: () => any; }) => {
          const member = await memberRef.get();
          if (!member.exists) {
            return null; // Skip if user does not exist
          }
          const memberData = member.data();
          return memberData
        });
        const teamMemebers = (await Promise.all(teamMemebersGET)).filter(member => member !== null);
        members.push(...teamMemebers || []);
      }
      return {
        teamInfo: { id: teamId, name: teamData.teamName || '', logoUrl: teamData.teamImage || '' },
        members: members,
      };
    } else {
      return { teamInfo: {}, members: members }
    }
  }

  async mapTeamInvitations(teamInvitations: any[], userId?: string): Promise<{ invitedTeams: any[], participantsList: any[] }> {
    const participants: any[] = [];
    const teamIds = teamInvitations.filter(team => Boolean(team?.teamId)).map(team => team?.teamId.trim());
    if (teamIds.length === 0) {
      return { invitedTeams: [], participantsList: [] };
    }
    const teams = await getDocumentsList(teamIds, 'teams');
    if (!teams || teams.length === 0) {
      return { invitedTeams: [], participantsList: [] };
    }
    const invitedTeam = teams.map(async (team) => {
      const invitedUsers = teamInvitations.find(teamInvitation => teamInvitation?.teamId === team?.id)?.invitedUsers || [];
      const invitedUsersData = await getDocumentsList(invitedUsers.filter((id: string) => id && id != userId).map((id: string) => id && id.trim()), 'users');
      const invitedUsersIDS = invitedUsersData.map(user => user?.userId);
      participants.push(...invitedUsersData);
      return ({
        teamInfo: {
          id: team.id,
          teamName: team?.teamName || 'Unknown Team',
          teamImage: team?.teamImage || '',
        },
        invitedUsers: invitedUsers.filter((id: string) => invitedUsersIDS.includes(id) && (userId ? id !== userId : true)),
      });
    })
    const invitedTeamResults = await Promise.all(invitedTeam);
    return {
      invitedTeams: invitedTeamResults,
      participantsList: participants,
    }
  }

  async validateClub(clubId: string): Promise<Object> {
    if (clubId) {
      const opponentClub = (await db.collection('clubs').doc(clubId).get()).data();
      if (!opponentClub) {
        throw new HttpException(ResponseMessage.Events.CLUB_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return { id: clubId, name: opponentClub.clubName || '', logoUrl: opponentClub.logoUrl || '' };
    } else {
      return { id: clubId };
    }
  }

  async addEventSubCollections(eventId: string, participants: any[], req: any, extraData?: { [key: string]: any }) {
    const { userId, name } = req.user;
    const eventParticipants: EventParticipantDto[] = [];
    const eventEvalution: EventEvaluationsDto[] = [];

    participants.flat().map(participant => {
      const { type, profile } = participant;
      const { firstName, lastName } = profile || {};
      eventParticipants.push({
        userId: participant?.userId,
        name: firstName || lastName ? firstName + ' ' + lastName : 'Unknown User',
        role: (type || 'guest').toUpperCase(),
        status: InviteStatus.INVITED,
        attendanceStatus: AttendanceStatus.PENDING,
        addedById: userId,
        ...extraData,
      });
      eventEvalution.push({
        userId: participant?.userId,
        evaluatorId: userId,
        evaluatorName: name,
        name: firstName || lastName ? firstName + ' ' + lastName : 'Unknown User',
        ...extraData,
      });
    })
    await this.addEventEvaluation(eventId, eventEvalution);
    await this.addEventParticipants(eventId, eventParticipants);
  }

  async updateEventParticipants(eventId: string, participants: EventParticipantDto[], req: any) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((participant) => {
      const participantRef = eventRef.collection('eventParticipants').doc(participant.userId);
      const updatedParticipant: EventParticipantDto = participant;
      batch.set(participantRef, updatedParticipant, { merge: true });
    });

    await batch.commit();
  }

  async updateEventEvaluation(eventId: string, participants: EventEvaluationsDto[], req: any) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((participant) => {
      const participantRef = eventRef.collection('eventEvaluations').doc(participant.userId);
      const updatedEvaluation: EventEvaluationsDto = participant;
      batch.set(participantRef, updatedEvaluation, { merge: true });
    });

    await batch.commit();
  }

  async addEventParticipants(eventId: string, participants: EventParticipantDto[]) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((participant) => {
      const participantRef = eventRef.collection('eventParticipants').doc(participant.userId);
      batch.set(participantRef, participant);
    });
    await batch.commit();
  }

  async removeEventParticipants(eventId: string, participants: string[]) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((id) => {
      const participantRef = eventRef.collection('eventParticipants').doc(id);
      batch.delete(participantRef);
    });

    await batch.commit();
  }

  async addEventEvaluation(eventId: string, participants: EventEvaluationsDto[]) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((participant) => {
      const evaluationRef = eventRef.collection('eventEvaluations').doc(participant.userId);
      batch.set(evaluationRef, participant);
    });

    await batch.commit();
  }

  async removeEventEvaluation(eventId: string, participants: string[]) {
    const eventRef = db.collection('events').doc(eventId);
    const batch = db.batch();

    participants.forEach((id) => {
      const evaluationRef = eventRef.collection('eventEvaluations').doc(id);
      batch.delete(evaluationRef);
    });

    await batch.commit();
  }

  async getInvitationList(type: string, req: any): Promise<Object | number> {
    const { userId } = req.user;
    //Find Event whose subcollection eventParticipants has the userId and status is invited
    if (type == 'count') {
      //Get Events 
      const eventRef = db.collectionGroup('eventParticipants').where('userId', '==', userId).where('status', '==', InviteStatus.INVITED);
      const snapshot = await eventRef.get();
      if (snapshot.empty) {
        return 0;
      }
      return snapshot.size;
    } else {
      const eventRef = db.collectionGroup('eventParticipants').where('userId', '==', userId).where('status', '==', InviteStatus.INVITED);
      const snapshot = await eventRef.get();
      if (snapshot.empty) {
        return [];
      }
      const events = [];
      for (const doc of snapshot.docs) {
        const parent = (await doc.ref.parent.parent.get()).data();
        parent.id = doc.ref.parent.parent.id;
        if (!parent || !parent.id) {
          continue; // Skip if parent event does not exist
        }
        parent.participants = await this.getEventParticipants(parent.id, true);
        parent.organizer = await this.getEventOrganizer(parent.organizerId);
        if (parent.type === 'match' || parent.type === 'team_training') {
          const teamInvitations = parent.teamInvitations || [];
          parent.teamInvitations = teamInvitations.map((team: any) => {
            const invitedUsers = team.invitedUsers.map((id: string) => {
              const user = parent.participants.find((participant: EventParticipantDto) => participant.userId === id);
              return user ? { ...user } : null;
            });
            return {
              teamInfo: {
                teamId: team.teamInfo.id,
                teamName: team.teamInfo.teamName,
                teamImage: team.teamInfo.teamImage,
              },
              invitedUsers
            }
          });
          if (parent?.opponentInvitations) {
            const opponentParticipant = parent.opponentInvitations.map((userId: string) => {
              const user = parent.participants.find((participant: EventParticipantDto) => participant.userId === userId);
              return user ? { ...user } : null;
            });
            parent.opponentInvitations = {
              teamInfo: parent.opponentTeam,
              invitedUsers: opponentParticipant
            }
          }
          delete parent.participants;
        }
        events.push(parent);
      }
      return events;
    }
  }

  async addComments(eventId: string, payload: EventCommentDto, req: any): Promise<string> {
    const { userId } = req.user;
    const { comment, media } = payload;

    const eventRef = db.collection('events').doc(eventId);
    const eventData = (await eventRef.get()).data();
    const participants = [];
    if (eventData?.type === 'match' || eventData?.type === 'team_training') {
      const teamInvitations = eventData?.teamInvitations || [];
      participants.push(...teamInvitations.flatMap((team: { invitedUsers: []; }) => team.invitedUsers));
      if (eventData?.opponentInvitations) {
        participants.push(...eventData.opponentInvitations);
      }
    } else {
      participants.push(...(eventData?.invitedUsers || []));
    }

    if (!participants.includes(userId) && eventData?.organizerId !== userId) {
      throw new HttpException(ResponseMessage.Events.USER_NOT_PARTICIPANT, HttpStatus.BAD_REQUEST);
    }
    const commentsRef = eventRef.collection('comments');
    const userInfo = await db.collection('users').doc(userId).get();
    if (!userInfo.exists) {
      throw new HttpException(ResponseMessage.User.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const userData = userInfo.data();
    const { firstName, lastName, fullName } = userData.profile || {};
    const name = (firstName || lastName) ? `${firstName} ${lastName}` : fullName?.length ? fullName.slice(-1)[0] : 'Unknown User';
    const commentData = { userId, name, createdAt: new Date().getTime() };
    if (userData?.media?.faceImage) {
      commentData['avatar'] = userData.media.faceImage;
    }
    commentData['userRole'] = userData?.type ? userData?.type.toUpperCase() : UserTypes.PLAYER;
    if (comment) {
      commentData['comment'] = comment;
    }
    if (media) {
      commentData['media'] = media;
    }
    await commentsRef.add(commentData);
    return ResponseMessage.Events.COMMENT.ADDED;
  }

  async getEventComments(eventId: string, getEventCommentDto: GetEventCommentDto, req: any): Promise<{
    comments: EventCommentDto[];
    nextPageCursor: string | null;
  }> {
    const { userId } = req.user;
    const { startAfterDocId, limit = 10 } = getEventCommentDto;
    const eventRef = db.collection('events').doc(eventId);
    const eventData = (await eventRef.get()).data();
    if (!eventData) {
      throw new HttpException(ResponseMessage.Events.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const participants = [];
    if (eventData?.type === 'match' || eventData?.type === 'team_training') {
      const teamInvitations = eventData?.teamInvitations || [];
      participants.push(...teamInvitations.flatMap((team: { invitedUsers: []; }) => team.invitedUsers));
      if (eventData?.opponentInvitations) {
        participants.push(...eventData.opponentInvitations);
      }
    } else {
      participants.push(...(eventData?.invitedUsers || []));
    }
    if (!participants.includes(userId) && eventData?.organizerId !== userId) {
      throw new HttpException(ResponseMessage.Events.USER_NOT_PARTICIPANT, HttpStatus.BAD_REQUEST);
    }

    let commentsQuery = eventRef.collection('comments')
      .orderBy('createdAt', 'asc');

    if (startAfterDocId) {
      const cursorDoc = await eventRef.collection('comments').doc(startAfterDocId).get();
      if (cursorDoc.exists) {
        commentsQuery = commentsQuery.startAfter(cursorDoc);
      } else {
        throw new HttpException('Pagination cursor not found.', HttpStatus.NOT_FOUND);
      }
    }

    const commentsSnapshot = await commentsQuery.limit(+limit).get();
    if (commentsSnapshot.empty) {
      return {
        comments: [],
        nextPageCursor: null
      }
    }

    const comments: EventCommentDto[] = [];
    for (const doc of commentsSnapshot.docs) {
      const commentData = doc.data() as any;
      commentData.id = doc.id;
      comments.push(commentData);
    }

    const lastVisibleDocId = commentsSnapshot.docs[commentsSnapshot.docs.length - 1]?.id || null;

    return {
      comments: comments,
      nextPageCursor: lastVisibleDocId
    };
  }
}  