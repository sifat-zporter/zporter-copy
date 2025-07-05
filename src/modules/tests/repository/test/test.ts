import mongoose from 'mongoose';
import { TableIndex } from '../../dtos/test/table-index.dto';
import { LogoType } from '../../enums/logo-type';
import { Metric } from '../../enums/metric';
import { Sequence } from '../../enums/sequence';
import { MediaSource } from './media-source';
import { Reference } from './reference';

export class Test {
  _id: mongoose.Types.ObjectId;
  subtypeId: string;
  references: Reference[];

  createdBy: string;
  testName: string;

  logoType: LogoType | string;
  media: MediaSource[];

  numberOfPeople: string;
  place: string;
  time: string;
  period: string;

  description: string;
  tableDescription: string;
  table: TableIndex[][];

  sequence: Sequence;
  title: string;
  placeholder: string;
  metric: Metric;

  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;

  public constructor(partial: Test);
  public constructor();
  public constructor(...args: any[]) {
    if (args.length == 1) {
      Object.assign(this, args[0]);
    } else {
      return new Test();
    }
  }
}
