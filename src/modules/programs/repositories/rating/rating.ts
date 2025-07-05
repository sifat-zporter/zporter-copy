export class Rating {
  createdBy: string;
  star: number;
  createdAt: Date;

  //# prepare for future feature
  comment?: string;
  numHelpful?: number;
}
