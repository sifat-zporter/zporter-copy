import mongoose from 'mongoose';
import { Program } from '../../../programs/repositories/program/program';
import { Country } from '../../../programs/repositories/program/country';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { TypeOfPrograms } from '../../../programs/enums/type-of-programs';
import { Role } from '../../../diaries/enum/diaries.enum';

export const defaultProgram: Program = {
  _id: new mongoose.Types.ObjectId(),
  idRoot: null,
  index: 0,
  createdBy: '',
  fullname: '',
  username: '',
  birthCountry: new Country(),
  country: '',
  city: '',
  clubId: '',
  userType: UserTypes.PLAYER,
  birthYear: 0,
  role: [],
  numberExecuted: 0,
  headline: '',
  ingressText: '',
  description: '',
  media: [],
  minParticipants: '',
  timeRun: '',
  tags: [],
  location: '',
  targetGroup: Role.ALL,
  mainCategory: TypeOfPrograms.OTHER,
  ageFrom: 0,
  ageTo: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  avgStar: 0,
  ratings: [],
  collections: [],
  shareWith: '',
  isPublic: true,
  version: 1,
  bookmarkUserIds: [],
};
