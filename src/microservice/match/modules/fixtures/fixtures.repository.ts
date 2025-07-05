import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Fixture } from './interfaces/fixture.interface';

@Injectable()
export class FixturesRepository {
  constructor(@InjectModel('Fixture') private readonly fixtureModel: Model<Fixture>) {}

  
  async findByDate(date: Date): Promise<Fixture[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.fixtureModel.find({
      startTime: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startTime: 'asc' }).exec();
  }
}