import { forwardRef, Inject, Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { USER_MODEL } from "./schemas/user.schema"
import { Model } from 'mongoose';
import { UserForMongo } from "./entities/user.entity";
import * as moment from 'moment';

@Injectable()
export class UsersFantazyService {
  constructor(
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserForMongo>,
  ) { }

  async savePointToUser(arrayTotalPoint: any[]) {
    const promises = arrayTotalPoint.map((e) => {
      return this.userModel.findOneAndUpdate(
        {
          userId: e._id.userId,
        },
        {
          totalPoint: e.totalPoint,
          timeoutTotalPoint: +moment.utc().add(7, 'days').format('x'),
        }
      )
    });

    await Promise.all(promises);
  }
}
