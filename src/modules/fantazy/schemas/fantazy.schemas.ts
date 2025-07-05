import { GenderTypes } from "../../../common/constants/common.constant";
import { UserDeleted, UserDetail, UserDetailDto } from "../dto/fantazy.dto";
import * as mongoose from 'mongoose';

export interface FantazyTeam {
	userId: string;
	age: string;
	gender: GenderTypes;
	country: string;
	timeRange: string;
	fantazyTeams: Array<UserDetailDto>;
	usersDeleted: Array<UserDeleted>;
	totalPoint: number;
	isFinished: boolean;
	finishedAt: number;
	createdAt: number;
	updatedAt: number;
}
export interface FantazyTeamWinner {
	userId: string;
	age: string;
	gender: GenderTypes;
	country: string;
	timeRange: string;
	fantazyTeams: Array<UserDetailDto>;
	totalPoint: number;
	createdAt: number;
	updatedAt: number;
}
const FANTAZY_TEAM_MODEL = 'fantazy_team';
const FANTAZY_TEAM_WINNER_MODEL = 'fantazy_team_winner';



const UserDetailSchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	userId: { type: String, required: true },
	index: { type: Number },
	type: { type: String, required: true },
	role: { type: String },
	addedAt: { type: Number },
})

const UserDeletedSchema = new mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	userId: { type: String, required: true },
	type: { type: String },
	role: { type: String },
	deletedAt: { type: Number, required: true }
})

const FantazyTeamSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	age: { type: String },
	gender: { type: String },
	country: { type: String },
	timeRange: { type: String, required: true },
	fantazyTeams: [UserDetailSchema],
	usersDeleted: [UserDeletedSchema],
	totalPoint: { type: Number },
	isFinished: { type: Boolean },
	finishedAt: { type: Number },
	createdAt: { type: Number },
	updatedAt: { type: Number },
})

FantazyTeamSchema.index({ userId: 1, timeRange: 1, createdAt: 1 });

const FantazyTeamWinnersSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	age: { type: String },
	gender: { type: String },
	country: { type: String },
	timeRange: { type: String, required: true },
	fantazyTeams: [UserDetailSchema],
	totalPoint: { type: Number },
	createdAt: { type: Number },
	updatedAt: { type: Number },
})

export { FANTAZY_TEAM_MODEL, FantazyTeamSchema, FANTAZY_TEAM_WINNER_MODEL, FantazyTeamWinnersSchema }
