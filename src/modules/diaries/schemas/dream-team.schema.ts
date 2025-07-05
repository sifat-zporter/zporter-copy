import * as mongoose from 'mongoose';

export interface DreamTeam {
    userIds: string[];
    timeRange: string;
    createdAt: number;
    updatedAt: number;
}
const DREAM_TEAM_MODEL = 'dream_teams';

const DreamTeamSchema = new mongoose.Schema({
    userIds: {type: Array},
    timeRange: {type: String},
    createdAt: {type: Number},
    updatedAt: {type: Number},
});

export {DREAM_TEAM_MODEL, DreamTeamSchema}