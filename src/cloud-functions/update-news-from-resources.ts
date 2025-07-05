import {
  SaveNewFeedDto,
  SynchronizePostDto,
  TypeOfPost,
} from './../modules/feed/dto/feed.req.dto';
import { convertXML2Json } from './../utils/convert-xml-to-json';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { db } from '../config/firebase.config';
import axios from 'axios';
import { MediaType } from '../modules/diaries/enum/diaries.enum';
import { v4 as uuidv4 } from 'uuid';
import { MediaDto } from '../modules/diaries/dto/diary.dto';

const saveNewsFeed = async (saveNewFeedDto: SaveNewFeedDto) => {
  const {
    hrefId,
    createdAt,
    headline,
    excerptText,
    link,
    typeOfPost,
    mediaLinks,
    providerId,
  } = saveNewFeedDto;
  const rssNewsRef = await db
    .collection('rss_news')
    .where('hrefId', '==', hrefId)
    .get();

  if (!rssNewsRef.empty) {
    return;
  }

  const newPostId = db.collection('rss_news').doc().id;

  await db
    .collection('rss_news')
    .doc(newPostId)
    .set(
      {
        hrefId,
        headline,
        excerptText,
        link,
        typeOfPost,
        providerId,
        mediaLinks: mediaLinks || [],
        createdAt: createdAt,
        updatedAt: createdAt,
      },
      { merge: true },
    );

  const synchronizePostDto = new SynchronizePostDto();
  synchronizePostDto.postId = newPostId;
  synchronizePostDto.typeOfPost = TypeOfPost.RSS_NEWS;

  return axios.post(
    `${process.env.BACKEND_URL}/feed/synchronize-posts-to-mongoose`,
    { ...synchronizePostDto },
    { headers: { roleId: 'none' } },
  );
};

export const updateNewsFromResources = functions
  .region(process.env.REGION)
  .pubsub.schedule('*/30 * * * *')
  .timeZone(process.env.DEFAULT_TIMEZONE)
  .onRun(async () => {
    try {
      const listProviders = [];
      const providerRef = await db.collection('rss_providers').get();

      providerRef.forEach((doc) => {
        listProviders.push({ ...doc.data(), providerId: doc.id });
      });

      const mappingSaveNewsFeedFromRSS = listProviders.map(async (el) => {
        if (el.rss) {
          const { data } = await axios.get(el.rss);
          const { channel }: any = convertXML2Json(data);

          if ((channel?.item as Array<any>)?.length) {
            const saveNews = (channel.item as Array<any>).map(async (i) => {
              let description: string;

              if (i['media:description']) {
                description = i['media:description']?._ as string;
              }

              if (i?.description as string) {
                description = i?.description as string;
              }

              const createdAt =
                +moment(moment(i.pubDate)).format('x') !== NaN
                  ? +moment(moment(i.pubDate)).format('x')
                  : +moment().utc().format('x');

              const newPost = new SaveNewFeedDto();
              newPost.headline = (i?.title as string).replace(/&quot;/g, `"`);
              newPost.excerptText = description || '';
              newPost.createdAt = createdAt;
              newPost.link = i.link as string;
              newPost.typeOfPost = TypeOfPost.RSS_NEWS;

              if (i?.link as string) {
                newPost.hrefId = String(i.link)
                  .split('/')
                  .filter((i) => i !== '')
                  .slice(-1)
                  .pop();
              }

              const mediaLinks: MediaDto[] = [];

              if ((i['media:thumbnail']?.url as string)?.includes('jpg')) {
                mediaLinks.push({
                  type: MediaType.IMAGE,
                  url: i['media:thumbnail']?.url as string,
                  uniqueKey: uuidv4(),
                });
              }

              if (i?.enclosure) {
                const enclosureType = i?.enclosure?.type as string;
                mediaLinks.push({
                  type: enclosureType.includes('image')
                    ? MediaType.IMAGE
                    : MediaType.VIDEO,
                  url: i?.enclosure?.url as string,
                  uniqueKey: uuidv4(),
                });
              }

              if (Array.isArray(i['media:content'])) {
                i['media:content'].map((img) => {
                  mediaLinks.push({
                    type:
                      (img?.type as string).indexOf('image') >= 0 ||
                      (img?.medium as string).indexOf('image') >= 0
                        ? MediaType.IMAGE
                        : MediaType.VIDEO,
                    url: img?.url as string,
                    uniqueKey: uuidv4(),
                  });
                });
              }

              if (!Array.isArray(i['media:content']) && i['media:content']) {
                mediaLinks.push({
                  type:
                    (i['media:content']?.type as string).indexOf('image') >=
                      0 ||
                    (i['media:content']?.medium as string).indexOf('image') >= 0
                      ? MediaType.IMAGE
                      : MediaType.VIDEO,
                  url: i['media:content']?.url as string,
                  uniqueKey: uuidv4(),
                });
              }

              const removeDuplicateImage = mediaLinks.reduce((unique, o) => {
                if (!unique.some((obj) => obj.url === o.url)) {
                  unique.push(o);
                }
                return unique;
              }, []);

              newPost.mediaLinks = removeDuplicateImage as MediaDto[];
              newPost.providerId = el.providerId as string;

              await saveNewsFeed(newPost);
            });
            await Promise.all(saveNews);
          }
        }
      });
      await Promise.all(mappingSaveNewsFeedFromRSS);
      return 'success';
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  });

export const getNewsFromNewProvider = functions
  .region(process.env.REGION)
  .firestore.document('rss_providers/{providerId}')
  .onCreate(async (change, context) => {
    try {
      const providerId = context.params.providerId;

      const providerRef = await db
        .collection('rss_providers')
        .doc(providerId)
        .get();

      const rssUrl = providerRef.data().rss;

      if (!rssUrl) {
        return;
      }

      const { data } = await axios.get(rssUrl);
      const { channel }: any = convertXML2Json(data);
      if ((channel.item as Array<any>)?.length) {
        const saveNews = (channel.item as Array<any>).map(async (i) => {
          let description: string;

          if (i['media:description']) {
            description = i['media:description']._ as string;
          }

          if (i.description as string) {
            description = i.description as string;
          }

          const newPost = new SaveNewFeedDto();
          newPost.headline = i.title as string;
          newPost.excerptText = description || '';
          newPost.createdAt = +moment.utc(moment(i.pubDate)).format('x');
          newPost.link = i.link as string;
          newPost.typeOfPost = TypeOfPost.RSS_NEWS;

          if (i?.link as string) {
            newPost.hrefId = String(i.link).split('/').slice(-1).pop();
          }

          const mediaLinks: MediaDto[] = [];

          if ((i['media:thumbnail']?.url as string)?.includes('jpg')) {
            mediaLinks.push({
              type: MediaType.IMAGE,
              url: i['media:thumbnail']?.url as string,
              uniqueKey: uuidv4(),
            });
          }

          if (i?.enclosure as string) {
            mediaLinks.push({
              type:
                i.enclosure.type === 'image/jpeg'
                  ? MediaType.IMAGE
                  : MediaType.VIDEO,
              url: i.enclosure.url as string,
              uniqueKey: uuidv4(),
            });
          }

          if (Array.isArray(i['media:content'])) {
            i['media:content'].map((img) => {
              mediaLinks.push({
                type:
                  img.type === 'image' ||
                  img.type === 'image/jpeg' ||
                  img.medium === 'image'
                    ? MediaType.IMAGE
                    : MediaType.VIDEO,
                url: img.url as string,
                uniqueKey: uuidv4(),
              });
            });
          }

          if (!Array.isArray(i['media:content']) && i['media:content']) {
            mediaLinks.push({
              type:
                i['media:content'].type === 'image' ||
                i['media:content'].type === 'image/jpeg' ||
                i['media:content'].medium === 'image'
                  ? MediaType.IMAGE
                  : MediaType.VIDEO,
              url: i['media:content']?.url as string,
              uniqueKey: uuidv4(),
            });
          }

          const removeDuplicateImage = mediaLinks.reduce((unique, o) => {
            if (!unique.some((obj) => obj.url === o.url)) {
              unique.push(o);
            }
            return unique;
          }, []);

          newPost.mediaLinks = removeDuplicateImage as MediaDto[];
          newPost.providerId = providerId as string;

          await saveNewsFeed(newPost);
        });
        await Promise.all(saveNews);
      }
      return 'success';
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  });

export const getZporterNewsFromNewZporter = functions
  .region(process.env.REGION)
  .firestore.document('zporter_news/{newsId}')
  .onCreate(async (change, context) => {
    try {
      const newsId = context.params.newsId;
      console.log('cuc cu', newsId);

      const synchronizePostDto = new SynchronizePostDto();
      synchronizePostDto.postId = newsId;
      synchronizePostDto.typeOfPost = TypeOfPost.ZPORTER_NEWS;

      await axios.post(
        `${process.env.BACKEND_URL}/feed/synchronize-posts-to-mongoose`,
        { ...synchronizePostDto },
        {
          headers: {
            'Cache-Control': 'no-cache',
            Accept: 'application/json',
          },
        },
      );
      return 'success';
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  });

export const updateZporterNewsToMongo = functions
  .region(process.env.REGION)
  .firestore.document('zporter_news/{newsId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists;
    const after = change.after.exists;

    const news = change.after.data();
    const id = context.params.newsId;

    try {
      if (before === true && after === false) {
        await axios.delete(
          `${process.env.BACKEND_URL}/feed/delete-posts-to-mongoose/${id}`,
        );
        console.log('delete with post: ', id);
      } else {
        const synchronizePostDto = new SynchronizePostDto();
        synchronizePostDto.postId = id;
        synchronizePostDto.typeOfPost = TypeOfPost.ZPORTER_NEWS;

        await axios.post(
          `${process.env.BACKEND_URL}/feed/synchronize-posts-to-mongoose`,
          { ...synchronizePostDto },
          {
            headers: {
              'Cache-Control': 'no-cache',
              Accept: 'application/json',
            },
          },
        );
        console.log(
          'sync successfully to ',
          `${process.env.BACKEND_URL}/feed/synchronize-posts-to-mongoose`,
        );
        console.log('update data: ', id);
      }
    } catch (error) {
      console.log('get error when update news from firebase to mongo');
      console.log(error);
    }
  });
