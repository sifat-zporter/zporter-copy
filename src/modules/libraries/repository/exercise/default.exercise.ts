import mongoose from 'mongoose';
import { Exercise } from '../../../programs/repositories/exercise/exercise';
import { Types } from 'mongoose';
import { Role } from '../../../diaries/enum/diaries.enum';
import { TypeOfPrograms } from '../../../programs/enums/type-of-programs';

export const defaultExercise: Exercise = {
  _id: new mongoose.Types.ObjectId(),
  idRoot: null,
  index: 0,
  createdBy: '',
  sessionId: new Types.ObjectId(),
  headline: '',
  ingressText: '',
  media: [],
  description: '',
  minParticipants: '',
  timeRun: '',
  tags: [],
  order: 0,
  avgStar: 0,
  ratings: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  ageFrom: 0,
  ageTo: 100,
  location: '',
  targetGroup: Role.ALL,
  mainCategory: TypeOfPrograms.TECHNICAL,
  collections: [],
  shareWith: '',
  // day: 0,
  technics: 0,
  tactics: 0,
  physics: 0,
  mental: 0,
  physicallyStrain: 0,
  isPublic: true,
  bookmarkUserIds: [],
};
