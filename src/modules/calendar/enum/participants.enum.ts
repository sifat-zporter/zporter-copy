export enum Role {
   ORGANIZER = "organizer",
   COACH = "coach",
   PLAYER = "player",
   GUEST = "guest",
}

export enum InviteStatus {
   INVITED = "invited",
   ACCEPTED = "accepted",
   DECLINED = "declined",
   NOT_RESPONDED = "not_responded",
   MAYBE = "maybe",
}

export enum AttendanceStatus {
   PENDING = "pending",
   PRESENT = "present",
   ABSENT = "absent",
   LATE = "late",
   EXCUSED = "excused",
}