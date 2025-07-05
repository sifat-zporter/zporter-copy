import { MediaDto } from "../dto/event.dto";

export interface Reminder {
  title: string;
  description: string;
  media?: MediaDto;
  isPrivate: boolean;
  startDate: Date | string;
  untilDate: Date | string;
  isNotification: boolean;
  notificationMinute?: number;
  recurringType?: string;
  invitedUsers?: Array<string>;
  location?: string;
  organizerId: string;
  organizerName_display: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}