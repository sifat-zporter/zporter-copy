import { Inject, Injectable } from '@nestjs/common';
import { AbstractService } from '../../abstract/abstract.service';
import { FeedRepository } from '../mongo-repository/feed.repository';
import { IFeedRepository } from '../mongo-repository/feed.repository.interface';
import { IFeedService } from './feed.service.interface';
import { GetListFeedQuery, TypeOfPost } from '../dto/feed.req.dto';
import { db } from '../../../config/firebase.config';
import { getPriorityOfPost } from '../../../helpers/get-priority-of-posts';
import { getPeriodTimeForQuery } from '../../../utils/get-period-time-for-query';
import { Post } from '../mongo-repository/post';
import { ConditionObject } from '../../abstract/dto/pipeline.dto';
import { deleteNullValuesInArray } from '../../../utils/delete-null-values-in-array';
import { NewsRequest } from '../dto/request/news.request';

@Injectable()
export class FeedMongoService
  extends AbstractService<IFeedRepository>
  implements IFeedService
{
  constructor(
    @Inject(FeedRepository)
    private feedRepository: IFeedRepository,
  ) {
    super(feedRepository);
  }

  async getPublicNews(getListFeedQuery: NewsRequest): Promise<any> {
    const { limit, startAfter, startAfterPostId } = getListFeedQuery;

    // const { fromTime, toTime } = getPeriodTimeForQuery(+startAfterTime);
    // if (fromTime == null || toTime == null) {
    //   return [];
    // }
    const now: number = this.dateUtil.getNowTimeInMilisecond();
    const zporterNewsRef = await db
      .collection('zporter_news')
      .where('pinUntil', '>=', now)
      .get();

    const { priority: priorityZporterNews } = getPriorityOfPost(
      TypeOfPost.ZPORTER_NEWS,
    );
    const { priority: priorityRSSNews } = getPriorityOfPost(
      TypeOfPost.RSS_NEWS,
    );

    const result: Post[] = await this.repository.get({
      match: {
        priority: [priorityRSSNews, priorityZporterNews],
        // createdAt: {
        //   $lte: +toTime,
        //   $gte: +fromTime,
        // } as ConditionObject,
        // TODO: postId: { $ne: startAfterPostId } as ConditionObject,
      },
      keySort: {
        'data.createdAt': -1,
        priority: 1,
        // 'data.postId': -1,
      },
      pageSize: +limit,
      page: +startAfter,
      project: {
        data: 1,
        _id: 1,
      },
    });

    //TODO: for the new query way
    // if (result.length == 0) {
    //   const condition: GetListFeedQuery = getListFeedQuery;
    //   condition.startAfterTime = fromTime;

    //   return this.getPublicNews(condition);
    // }
    return result.map(({ data }) => data);
  }
}
