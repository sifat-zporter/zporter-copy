export enum EventType {
    REMINDER = "reminder",
    TEAM_TRAINING = "team_training",
    MATCH = "match",
}

export enum OtherEventsType {
    MEETING = "meeting",
    PERSONAL_TRAINING = "personal_training",
    GROUP_TRAINING = "group_training",
    CAMP = "camp",
    SEMINAR = "seminar",
    CUP = "cup",
    SERIES = "series",
    OTHER = "other"
}

export enum EventTypeFormatted {
    reminder = "Reminder",
    team_training = "Team Training",
    match = "Match",
    meeting = "Meeting",
    personal_training = "Personal Training",
    group_training = "Group Training",
    camp = "Camp",
    seminar = "Seminar",
    cup = "Cup",
    series = "Series",
    other = "Other"
}

export enum FilterEventsType {
    ALL = "all",
    REMINDER = "reminder",
    EVENTS = "events",
}

export enum MediaType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
}

export enum MatchSide {
    HOME = 'home',
    AWAY = 'away',
}

export enum MatchCategory {
    CUP = 'cup',
    SERIES = 'series',
}

export enum ParticipantVisibility {
    ALL = "all",
    ACCEPTED = "accepted",
    DECLINED = "declined",
    NOT_RESPONDED = "not_responded"
}

export enum GetInvitationType {
    LIST = "list",
    COUNT = "count",
}

export enum RecurringType {
    ONCE = "once",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
}

export enum EventVisibility {
    ALL = "all",
    PUBLIC = "public",
    PRIVATE = "private",
}
