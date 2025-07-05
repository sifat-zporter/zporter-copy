import { NewsRequest } from '../dto/request/news.request';

export interface IFeedService {
  getPublicNews(getListFeedQuery: NewsRequest): Promise<any>;
}
