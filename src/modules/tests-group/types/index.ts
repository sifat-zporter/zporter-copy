import { Metric } from '../../tests/enums/metric';

export type Test = {
  id: string;
  label: string;
  metric: Metric;
  media: string[];
  parent?: string;
};

export type TestCategory = {
  label: string;
  data: Test[];
};

export type Member = {
  userId: string;
  fullName: string;
  username: string;
  faceImage: string;
  favoriteRoles: string[];
  location: string;
  clubName: string;
  fcmToken: string[];
  [key: string]: any;
};

export type Team = {
  teamId: string;
  teamName: string;
  teamImage: string;
};
