import { MediaDto } from "../../diaries/dto/diary.dto";
import { AttendanceStatus, InviteStatus } from "../enum/participants.enum";

export interface ParticipantsStatus {
    userId: string,
    status: InviteStatus,
    autoAcceptSimilarEvents?: boolean,
    notificationMinutes?: number,
    message?: string,
    declineReason?: string,
}

export interface ParticipantsAttendance {
    userId: string,
    attendanceStatus: AttendanceStatus,
}