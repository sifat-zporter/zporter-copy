import mongoose from 'mongoose';

export interface Event {
  title: string;
  description?: string;
  startTime: Number;
  endTime: Number;
  allDay?: boolean;
  location?: string | { name: string; address: string; latitude?: number; longitude?: number };
  type: 'training' | 'match' | 'meeting' | 'other';
  organizerId: string;
  organizerName_display: string;
  zporterTeamId?: string;
  zporterTeamName_display?: string;
  zporterClubId?: string;
  visibility?: 'participants_only' | 'team_visible' | 'club_visible';
  colorTag?: string;
  linkedMatchId_zporter?: string;
  participantSummary?: Map<string, number>;
  createdAt?: Number;
  updatedAt?: Number;
  recurringRule?: string;
  isRecurringBase?: boolean;
  recurringEventId?: string;
  isDeleted?: boolean;
  eventParticipants?: Array<{
    zporterUserId: string;
    displayName_display: string;
    roleInEvent: 'organizer' | 'coach' | 'player' | 'guest';
    inviteStatus: 'invited' | 'accepted' | 'declined' | 'maybe';
    attendanceStatus: 'pending' | 'present' | 'absent' | 'late' | 'excused';
    rsvpAt?: Number;
    addedById: string;
  }>;
  eventEvaluations?: Array<{
    evaluationId: string;
    evaluatorId: string;
    evaluatorName_display: string;
    evaluatedUserId: string;
    evaluatedUserName_display: string;
    evaluationDate: Number;
    overallRating?: Number;
    publicComments?: string;
    privateNotes_coach?: string;
    criteria?: Map<string, number>;
    sharedWithUserAt?: Number;
  }>;
}

const EVENT_MODEL = 'events';

const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  startTime: Number,
  endTime: Number,
  allDay: Boolean,
  location: mongoose.Schema.Types.Mixed,
  type: {
    type: String,
    enum: ['training', 'match', 'meeting', 'other'],
  },
  organizerId: String,
  organizerName_display: String,
  zporterTeamId: String,
  zporterTeamName_display: String,
  zporterClubId: String,
  visibility: {
    type: String,
    enum: ['participants_only', 'team_visible', 'club_visible'],
    default: 'participants_only',
  },
  colorTag: String,
  linkedMatchId_zporter: String,
  participantSummary: {
    type: Map,
    of: Number,
    default: {},
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
  updatedAt: Number,
  recurringRule: String,
  isRecurringBase: Boolean,
  recurringEventId: String,
  isDeleted: {
    type: Boolean,
    default: false
  },
  eventParticipants: [{
    zporterUserId: { type: String, required: true },
    displayName_display: { type: String, required: true },
    roleInEvent: {
      type: String,
      enum: ['organizer', 'coach', 'player', 'guest'],
      required: true,
    },
    inviteStatus: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'maybe'],
      required: true,
      default: 'invited',
    },
    attendanceStatus: {
      type: String,
      enum: ['pending', 'present', 'absent', 'late', 'excused'],
      required: true,
      default: 'pending',
    },
    rsvpAt: { type: Number, default: null },
    addedById: { type: String, required: true },
  }],
  eventEvaluations: [{
    evaluationId: mongoose.Schema.Types.ObjectId,
    evaluatorId: { type: String, required: true },
    evaluatorName_display: { type: String, required: true },
    evaluatedUserId: { type: String, required: true },
    evaluatedUserName_display: { type: String, required: true },
    evaluationDate: { type: Number, required: true },
    overallRating: { type: Number, default: null },
    publicComments: { type: String, default: null },
    privateNotes_coach: { type: String, default: null },
    criteria: {
      type: Map,
      of: Number,
      default: {},
    },
    sharedWithUserAt: { type: Number, default: null },
  }],
}, {
  timestamps: true,
  versionKey: false,
});

EventSchema.index({
  title: 'text',
  description: 'text',
  organizerId: 'text',
  zporterTeamId: 'text',
  zporterTeamName_display: 'text',
});

export { EventSchema, EVENT_MODEL };
