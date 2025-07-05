import { TypeOfPost } from '../modules/feed/dto/feed.req.dto';

export const getPriorityOfPost = (typeOfPost: TypeOfPost) => {
  switch (typeOfPost) {
    case TypeOfPost.REMIND_UPDATE_DIARIES:
      return { criteria: 'currentUser', priority: 1 };
    case TypeOfPost.DIARIES:
      return { criteria: null, priority: 2 };
    case TypeOfPost.SHARED_LEADERBOARD:
      return { criteria: null, priority: 3 };
    case TypeOfPost.SHARED_BIOGRAPHIES:
      return { criteria: null, priority: 4 };
    case TypeOfPost.USER_TEST_POST:
      return { criteria: null, priority: 4 };
    case TypeOfPost.PLAIN_POSTS:
      return { criteria: null, priority: 5 };
    case TypeOfPost.ZTAR_OF_THE_MATCH:
      return { criteria: null, priority: 5 };
    case TypeOfPost.SHARED_DREAM_TEAMS:
      return { criteria: null, priority: 5 };
    case TypeOfPost.DREAM_TEAM_POSTS:
      return { criteria: null, priority: 5 };
    case TypeOfPost.FANTAZY_TEAM_POSTS:
      return { criteria: null, priority: 5 };
    case TypeOfPost.FANTAZY_MANAGER_OF_THE_MONTH:
      return { criteria: null, priority: 6 };
    case TypeOfPost.PLAYER_OF_THE_WEEK:
      return { criteria: null, priority: 6 };
    case TypeOfPost.BIRTHDAYS:
      return { criteria: null, priority: 6 };
    case TypeOfPost.PERSONAL_GOALS:
      return { criteria: null, priority: 7 };
    case TypeOfPost.TRANSFERS:
      return { criteria: null, priority: 8 };
    case TypeOfPost.ZPORTER_NEWS:
      return { criteria: 'none', priority: 9 };
    case TypeOfPost.RSS_NEWS:
      return { criteria: 'none', priority: 10 };
  }
};
