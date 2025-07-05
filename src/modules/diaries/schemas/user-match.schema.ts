import * as mongoose from 'mongoose';

export interface UserMatch {
    userId: string;
    diaryId: string;
    originalDiaryId: string;
    country: string;
    favoriteRole: string;
    totalPointPerMatch: number;
    dateTime: number;
    createdAt: number;
    updatedAt: number;
}

const USER_MATCH_MODEL = 'users_matches';

const UsersMatchSchema = new mongoose.Schema({
    userId: {type: String},
    diaryId: {type: String},
    originalDiaryId: {type: String},
    country: {type: String},
    favoriteRole: {type: String},
    totalPointPerMatch: {type: Number},
    dateTime: {type: Number},
    createdAt: {type: Number},
    updatedAt: {type: Number},
});

export {USER_MATCH_MODEL, UsersMatchSchema}