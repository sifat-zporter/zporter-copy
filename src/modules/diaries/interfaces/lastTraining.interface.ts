import { TypeOfPost } from "../../feed/dto/feed.req.dto";
import { CoachTrainingDto, PlayerTrainingDto } from "../dto/training.dto";
import { EatAndDrink, EnergyLevel, Sleep, TypeOfDiary } from "../enum/diaries.enum";

export interface ILastTraining {
    createdAt: number;
    updatedAt: number;
    userId: string;
    typeOfPost: TypeOfPost;
    originalDiaryId: string;
    training: CoachTrainingDto | PlayerTrainingDto;
    teamId?: string;
    typeOfDiary: TypeOfDiary;
    energyLevel?: EnergyLevel;
    eatAndDrink?: EatAndDrink;
    sleep?: Sleep;
}