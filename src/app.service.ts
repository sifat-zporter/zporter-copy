import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import * as firebase from 'firebase-admin';
import * as geoip from 'geoip-lite';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import { countries } from './common/constants/country';
import { DetectLocationDto } from './common/dto/detect-location.dto';
import { GetFAQsDto } from './common/dto/get-faqs.dto';
import { db } from './config/firebase.config';
import { MediaDto } from './modules/diaries/dto/diary.dto';
import { PostQueryDto, TypeOfPost } from './modules/feed/dto/feed.req.dto';
import {
  OutputListNewsFeed,
  ProviderInfoDto,
  TagsDto,
} from './modules/feed/dto/feed.res.dto';
import { SendEmailService } from './modules/send-email/send-email.service';
import { GetTokenDto } from './modules/users/dto/get-token.dto';
import { ResponseFifaCountries } from './types/fifa-services.types';
import { ICountry } from './modules/users/interfaces/users.interface';

@Injectable()
export class AppService {
  constructor(
    @Inject(forwardRef(() => SendEmailService))
    private sendEmailService: SendEmailService,
  ) { }
  async getHello(): Promise<string> {
    return 'Welcome to Zporter';
  }

  async checkWebhookGoogleChat() {
    throw new InternalServerErrorException(
      'Just check webhook! dont have any bug in here',
    );
  }

  async getToken(
    ipAddress: string,
    getTokenDto: GetTokenDto,
  ): Promise<AxiosResponse<any>> {
    try {
      const response = await axios.post(
        `${process.env.FB_AUTH_BASE_URL}?key=${process.env.FB_WEB_API_KEY}`,
        { ...getTokenDto },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.detectNewDevice(ipAddress, response);

      return response.data;
    } catch (e) {
      throw new HttpException(
        `${e.response.data.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async detectNewDevice(ipAddress: string, response: AxiosResponse) {
    const location = geoip.lookup(ipAddress);

    if (location) {
      const userRef = await db
        .collection('users')
        .where('uid', '==', response.data.localId)
        .get();

      const userDocs = userRef.docs;

      const savingIpAddress = userDocs.map(async (doc) => {
        const { ips = [] } = doc.data();

        if (doc.data()?.ips?.length) {
          if (!ips.includes(ipAddress)) {
            const resetPasswordUrl = await firebase
              .auth()
              .generatePasswordResetLink(response.data.email);

            const dynamic_template_data = {
              ipAddress,
              timestamp: momentTz()
                .tz(location.timezone)
                .format('D MMM YYYY HH:mm:ssZ'),
              location: `${location.city}/${location.country}`,
              resetPasswordUrl: resetPasswordUrl,
            };

            const { email } = response.data;

            // const payload = new SendEmailDto();
            // payload.email = email;
            // payload.dynamic_template_data = dynamic_template_data;
            // payload.subject = '[Zporter] Security alert';
            // payload.templateId = 'd-acfba4d332d9416c858136e838b0e055';
            // await sendEmailTemplate(payload);

            await this.sendEmailService.sendNewDeviceLogin({
              email,
              dynamic_template_data,
            });
          }

          doc.ref.set(
            {
              ips: firebase.firestore.FieldValue.arrayUnion(ipAddress),
            },
            { merge: true },
          );
        } else {
          doc.ref.set(
            {
              ips: [ipAddress],
            },
            { merge: true },
          );
        }
      });

      await Promise.all(savingIpAddress);
    }
  }

  async getZporterNews(newsId: string) {
    const newsRef = await db.collection('zporter_news').doc(newsId).get();

    if (!newsRef.exists) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const postQueryDto = new PostQueryDto();
    postQueryDto.typeOfPost = newsRef.data()?.typeOfPost;
    postQueryDto.postId = newsRef.id;

    const providerInfo = await db
      .collection('rss_providers')
      .doc(newsRef.data()?.providerId)
      .get();

    const result = new OutputListNewsFeed();
    result.postId = newsId as string;
    result.hrefId = newsRef.data()?.hrefId as string;
    result.headline = newsRef.data()?.headline as string;
    result.link = `${process.env.BACKEND_URL}/zporter-news/${newsId}` as string;
    result.excerptText = newsRef.data()?.excerptText as string;
    result.createdAt =
      moment.utc(newsRef.data()?.createdAt).fromNow() ||
      moment
        .utc(newsRef.data()._fl_meta_.createdDate._seconds * 1000)
        .fromNow();
    result.typeOfPost = newsRef.data()?.typeOfPost as TypeOfPost;
    result.posterImageUrl =
      newsRef.data()?.posterImage ||
      ('https://firebasestorage.googleapis.com/v0/b/zporter-dev-media/o/media%2Ficon_zporter_white48.png?alt=media&token=d9e219c4-4474-4f76-8aaa-c8b1abc35cd4' as string);
    result.mediaLinks = newsRef.data()?.mediaLinks.map((e) => {
      return {
        type: e.type,
        uniqueKey: e.uniqueKey,
        url: e.url,
      };
    }) as MediaDto[];
    result.providerId =
      newsRef.data()?.providerId ||
      'r9Wm3nR4ojdvfvxUSOmW7bU9Ywt1' ||
      (newsRef.data()?._fl_meta_?.createdBy as string);
    result.content = newsRef.data()?.content as string;
    result.providerInfo = providerInfo.data() as ProviderInfoDto;
    result.tags = newsRef.data()?.tags as TagsDto;

    return { ...result };
  }

  async getCountry(): Promise<any> {
    return countries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLocationByIp(detectLocationDto: DetectLocationDto): Promise<any> {
    const { ip } = detectLocationDto;
    const res = await axios.get(`http://ip-api.com/json/${ip}`);
    return res.data;
  }

  async requestResetPassword(email: string) {
    try {
      const user = await firebase.auth().getUserByEmail(email);

      if (user) {
        await db.collection('reset_password_requests').add({ email });
      }

      return {
        email,
        message: 'Check your inbox for the link to reset your password.',
        statusCode: 200,
      };
    } catch (error) {
      console.log(error);

      if (error.code === 'auth/user-not-found') {
        throw new NotFoundException(
          'There is no user record corresponding to the provided identifier',
        );
      }

      if (error.code === 'auth/invalid-email') {
        throw new BadRequestException(
          'The email address is improperly formatted.',
        );
      }
    }
  }

  async getFAQsFirebase(getFAQsDto: GetFAQsDto) {
    const { topic, sorted } = getFAQsDto;
    let faqRef;
    const topicsRaw = [];

    if (topic) {
      faqRef = db
        .collection('faqs')
        .orderBy('createdAt', sorted)
        .where('topic', '==', topic);
    } else {
      faqRef = db.collection('faqs').orderBy('createdAt', sorted);
    }

    const querySnapshot = await faqRef.get();

    let faqs = [];

    faqs = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      const TOPIC = data.topic;

      topicsRaw.push(TOPIC);

      return {
        faqId: doc.id,
        question: data.question,
        answer: data.answer,
        thumbnailUrl: data?.thumbnailUrl || null,
        topic: TOPIC,
        createdAt: data.createdAt,
        updatedAt: data.createdAt || null,
      };
    });

    return {
      topics: [...new Set(topicsRaw)],
      faqs,
    };
  }

  async getPrivacyRules() {
    const doc = await db.collection('terms').doc('privacy_rules').get();
    return {
      content: doc.data().content,
      updatedAt: doc.data()._fl_meta_?.lastModifiedDate?._seconds || null,
    };
  }

  async getTermsAndConditions() {
    const doc = await db.collection('terms').doc('terms_conditions').get();
    return {
      content: doc.data().content,
      updatedAt: doc.data()._fl_meta_?.lastModifiedDate?._seconds || null,
    };
  }

  async getFAQs() {
    const faqsDocs = await db.collection('faqs').get();
    const topicsRaw = [];
    const faqs = faqsDocs.docs.map((doc) => {
      const data = doc.data();

      const TOPIC = data.topic.toUpperCase();

      topicsRaw.push(TOPIC);

      return {
        question: data.question,
        answer: data.answer,
        thumbnailUrl: data?.thumbnailUrl || null,
        topic: TOPIC,
        createdDate: data._fl_meta_?.createdDate?._seconds,
        updatedDate: data._fl_meta_?.lastModifiedDate?._seconds || null,
      };
    });

    return {
      topics: [...new Set(topicsRaw)],
      faqs,
    };
  }

  async syncFifaCountries(dateId: string) {
    const { data } = await axios.get<ResponseFifaCountries>(
      `https://inside.fifa.com/api/ranking-overview`,
      {
        params: {
          locale: 'en',
          dateId,
          rankingType: 'football',
        },
      },
    );
    if (data) {
      const { rankings } = data;
      if (rankings.length) {
        const countries: any = rankings.map((country) => ({
          name: country.rankingItem.name,
          flag: country.rankingItem.flag.src,
          alpha2Code: country.rankingItem.countryCode?.slice(0, 2),
          alpha3Code: country.rankingItem.countryCode,
          region: country.tag.text,
          continental_confederations: country.tag.text,
        }));
        const sortedCountries = countries.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        const countriesRef = db.collection('fifa_countries');
        await countriesRef.doc('countries').set({ countries });
        return sortedCountries;
      }
    }
    throw new HttpException('No data', HttpStatus.NOT_FOUND);
  }

  async getFifaCountries() {
    const countriesRef = await db
      .collection('fifa_countries')
      .doc('countries')
      .get();
    return countriesRef.data()?.countries || [];
  }
}
