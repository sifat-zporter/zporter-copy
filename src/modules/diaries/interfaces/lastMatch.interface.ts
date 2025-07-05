import { TypeOfPost } from "../../feed/dto/feed.req.dto";
import { CoachMatchDto, PlayerMatchDto } from "../dto/match.dto";
import { EatAndDrink, EnergyLevel, Sleep, TypeOfDiary } from "../enum/diaries.enum";

export interface ILastMatch {
	createdAt: number;
	updatedAt: number;
	userId: string;
	typeOfPost: TypeOfPost;
	originalDiaryId: string;
	match: CoachMatchDto | PlayerMatchDto;
	teamId?: string;
	typeOfDiary: TypeOfDiary;
	injuries?: any[];
	energyLevel?: EnergyLevel;
	eatAndDrink?: EatAndDrink;
	sleep?: Sleep;
};