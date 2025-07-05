import mongoose from 'mongoose';
import { Session } from '../../../programs/repositories/session/session';
import { TypeOfPrograms } from '../../../programs/enums/type-of-programs';

export const defaultSession: Session = {
  _id: new mongoose.Types.ObjectId(),
  idRoot: null,
  index: 0,
  createdBy: '',
  programId: null,
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

  technics: 0,
  tactics: 0,
  physics: 0,
  mental: 0,
  physicallyStrain: 0,

  isPublic: true,

  day: 0,
  ageFrom: 0,
  ageTo: 100,
  location: '',
  targetGroup: '',
  mainCategory: TypeOfPrograms.TECHNICAL,
  collections: [],
  shareWith: '',
  bookmarkUserIds: [],
};
