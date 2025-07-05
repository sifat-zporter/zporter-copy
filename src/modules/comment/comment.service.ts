import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as moment from 'moment';
import { ResponseMessage } from '../../common/constants/common.constant';
import { db } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { deleteCollection } from '../../utils/delete-subCollection';
import {
  LikeQueryDto,
  PostQueryDto,
  Query,
  TypeOfPost,
} from '../feed/dto/feed.req.dto';
import { UserCommentDto } from '../feed/dto/feed.res.dto';
import {
  CreateNotificationDto,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { FeedService } from './../feed/feed.service';
import { CreateCommentDto, ListCommentQuery } from './dto/comment.req.dto';
import { ResponseCreateCommentDto } from './dto/comment.res.dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
  ) {}

  async limitPostComments(userId: string) {
    const LIMIT_POSTS_COMMENTS_PER_DAY = 200;

    const from = +moment.utc().startOf('day').format('x');
    const to = +moment.utc().endOf('day').format('x');

    const commentRef = await db
      .collectionGroup('comments')
      .orderBy('createdAt', 'desc')
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .where('userId', '==', userId)
      .get();

    if (commentRef.size > LIMIT_POSTS_COMMENTS_PER_DAY) {
      throw new HttpException(
        `Limit of ${LIMIT_POSTS_COMMENTS_PER_DAY} post comments per day`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getCountComments(listCommentQuery: ListCommentQuery) {
    const { postId, typeOfPost } = listCommentQuery;

    const commentRef = db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc');

    const count = await commentRef.get();

    return count.size;
  }

  async getListComments(
    listCommentQuery: ListCommentQuery,
    currentUserId: string,
  ) {
    const data = [];
    const { limit, startAfter } = listCommentQuery;
    const { postId, typeOfPost } = listCommentQuery;

    let commentRef = db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc');

    if (startAfter) {
      commentRef = commentRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      commentRef = commentRef.limit(+limit);
    }

    const querySnapshot = await commentRef.get();

    querySnapshot.forEach((doc) => {
      data.push({ ...doc.data(), commentId: doc.id });
    });

    const mappingUserInfo = data.map(async (doc) => {
      const userInfo = await mappingUserInfoById(doc.userId);
      const isLiked = await this.checkLikedComment(
        listCommentQuery,
        doc.commentId,
        currentUserId,
      );
      return {
        lastName: userInfo.lastName as string,
        firstName: userInfo.firstName as string,
        faceImage: userInfo.faceImage as string,
        userId: userInfo.userId as string,
        content: doc.content as string,
        username: userInfo.username as string,
        createdAt: doc?.createdAt as number,
        updatedAt: doc?.updatedAt as number,
        commentId: doc.commentId as string,
        type: userInfo.type as UserTypes,
        isLiked: isLiked,
      };
    });
    const userComments: UserCommentDto[] = await Promise.all(mappingUserInfo);
    const countComments = await this.getCountComments(listCommentQuery);
    return { data: userComments, countComments: countComments };
  }

  async checkLikedComment(
    postQueryDto: PostQueryDto,
    commentId: string,
    currentUserId: string,
  ) {
    const { postId, typeOfPost } = postQueryDto;

    const checkLikedCmt = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .doc(commentId)
      .collection('like_comments')
      .doc(currentUserId)
      .get();

    const isLiked: boolean = checkLikedCmt.data() ? true : false;
    return isLiked;
  }

  async createComment(
    createCommentDto: CreateCommentDto,
    postQueryDto: PostQueryDto,
    currentUserId: string,
  ) {
    const { postId, typeOfPost } = postQueryDto;

    const [postRef] = await Promise.all([
      db.collection(String(typeOfPost)).doc(postId).get(),
      this.limitPostComments(currentUserId),
    ]);

    if (!postRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkBlocked = await db
      .collection('blacklists')
      .where('postId', '==', postId)
      .where('typeOfPost', '==', typeOfPost)
      .where('userId', '==', currentUserId)
      .get();

    if (!checkBlocked.empty) {
      throw new HttpException(
        ResponseMessage.Feed.HAVE_BLOCKED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const createdAt = +moment.utc().format('x');

    const [newComment] = await Promise.all([
      db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .add({
          ...createCommentDto,
          postId: postId,
          createdAt: createdAt,
          updatedAt: createdAt,
          userId: currentUserId,
        }),
      postRef.ref.set(
        { updatedAt: +moment.utc().format('x') },
        { merge: true },
      ),
    ]);

    const countComments = await this.getCountComments(<ListCommentQuery>{
      typeOfPost,
      postId,
    });

    const data = new ResponseCreateCommentDto();
    data.content = createCommentDto.content;
    data.commentId = newComment.id;
    data.createdAt = createdAt;

    if (
      typeOfPost === TypeOfPost.ZPORTER_NEWS ||
      typeOfPost === TypeOfPost.RSS_NEWS
    ) {
      return { ...data, countComments };
    }

    const [ownerPostInfo, userInfo] = await Promise.all([
      mappingUserInfoById(postRef.data()?.userId),
      mappingUserInfoById(currentUserId),
    ]);

    this.feedService.synchronizePostsToMongoose(postQueryDto);

    const payload = new CreateNotificationDto();
    payload.token = ownerPostInfo.fcmToken as string[];
    payload.title = `${userInfo.username} commented` as string;
    payload.notificationType = NotificationType.COMMENT_POST;
    payload.senderId = currentUserId;
    payload.topic = `comment-${typeOfPost}-${postId}`;
    payload.content = createCommentDto.content;
    payload.receiverId = ownerPostInfo.userId as string;
    payload.username = userInfo.username as string;
    payload.largeIcon = userInfo.faceImage as string;
    payload.userType = userInfo.type as UserTypes;
    payload.others = {
      postId,
      typeOfPost: String(typeOfPost),
    };

    const { topic } = payload;

    await Promise.all([
      this.notificationsService.subscribeTopic(
        ownerPostInfo.fcmToken,
        topic,
        ownerPostInfo.userId,
      ),
      this.notificationsService.unSubscribeTopic(
        userInfo.fcmToken,
        topic,
        currentUserId,
      ),
    ]);

    await this.notificationsService.sendToTopic(payload);

    this.notificationsService.subscribeTopic(
      userInfo.fcmToken,
      topic,
      currentUserId,
    );

    return { ...data, countComments: countComments };
  }

  async likeComment(
    currentUserId: string,
    likeQueryDto: LikeQueryDto,
  ): Promise<string> {
    const { query, postId, typeOfPost, commentId } = likeQueryDto;
    if (!commentId) {
      throw new HttpException(
        ResponseMessage.Feed.COMMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const [commentRef, likeCommentRef] = await Promise.all([
      db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .doc(commentId)
        .get(),
      db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .doc(commentId)
        .collection('like_comments')
        .doc(currentUserId)
        .get(),
    ]);

    if (!commentRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.COMMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!likeCommentRef.data() && query === Query.LIKE) {
      await db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .doc(commentId)
        .collection('like_comments')
        .doc(currentUserId)
        .set(
          {
            postId,
            typeOfPost,
            commentId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            userId: currentUserId,
          },
          { merge: true },
        );
      return ResponseMessage.Feed.LIKE;
    }

    if (likeCommentRef.data() && query === Query.UNLIKE) {
      await db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .doc(commentId)
        .collection('like_comments')
        .doc(currentUserId)
        .delete();

      return ResponseMessage.Feed.UNLIKE;
    }
  }

  async blockComment(
    postQueryDto: PostQueryDto,
    commentId: string,
    currentUserId: string,
  ) {
    const { postId, typeOfPost } = postQueryDto;

    const postRef = await db.collection(`${typeOfPost}`).doc(postId).get();

    const commentRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .doc(commentId)
      .get();

    if (!postRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!commentRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.COMMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (commentRef.data()?.userId === postRef.data()?.userId) {
      throw new HttpException(
        ResponseMessage.Feed.CANNOT_BLOCK.CANNOT_BLOCK_YOURSELF,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (postRef.data()?.userId !== currentUserId) {
      throw new HttpException(
        ResponseMessage.Feed.CANNOT_BLOCK.CANNOT_BLOCK_FROM_OTHER_POST,
        HttpStatus.BAD_REQUEST,
      );
    }

    const blockUser = db.collection('blacklists').add({
      postId,
      typeOfPost,
      userId: commentRef.data().userId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });
    const blackList = true;
    const deleteComment = await this.deleteComment(
      postQueryDto,
      commentId,
      blackList,
    );

    await Promise.all([blockUser, deleteComment]);

    const countComments = await this.getCountComments(<ListCommentQuery>{
      typeOfPost,
      postId,
    });

    return { message: ResponseMessage.Feed.BLOCKED_COMMENT, countComments };
  }

  async deleteComment(
    postQueryDto: PostQueryDto,
    commentId: string,
    blackList = false,
  ) {
    const { postId, typeOfPost } = postQueryDto;

    const diaryRef = await db.collection(`${typeOfPost}`).doc(postId).get();
    if (!diaryRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const commentRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .doc(commentId)
      .get();

    if (!commentRef.data()) {
      throw new HttpException(
        ResponseMessage.Feed.COMMENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (blackList) {
      const userComments = await db
        .collectionGroup('comments')
        .where('userId', '==', commentRef.data()?.userId)
        .get();
      const data = [];
      userComments.forEach(async (doc) => {
        data.push({ ...doc.data(), commentId: doc.id });
      });

      await Promise.all(
        data.map(async (x) => {
          const collectionPath = `${typeOfPost}/${postId}/comments/${x.commentId}/like_comments/`;
          await deleteCollection(db, collectionPath, 50);

          await db
            .collection(`${typeOfPost}`)
            .doc(postId)
            .collection('comments')
            .doc(x.commentId)
            .delete();
        }),
      );
    }

    if (!blackList) {
      const collectionPath = `${typeOfPost}/${postId}/comments/${commentId}/like_comments/`;
      await deleteCollection(db, collectionPath, 50);

      await db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('comments')
        .doc(commentId)
        .delete();
    }

    const countComments = await this.getCountComments(<ListCommentQuery>{
      typeOfPost,
      postId,
    });

    return { message: ResponseMessage.Feed.DELETED_COMMENT, countComments };
  }
}
