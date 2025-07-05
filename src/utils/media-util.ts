import { ZPORTER_DEFAULT_IMAGE } from '../common/constants/common.constant';
import { MediaDto } from '../modules/diaries/dto/diary.dto';
import { MediaType } from '../modules/diaries/enum/diaries.enum';
import { VideoLinkSources } from '../modules/users/enum/common.enum';
import { getYouTubeId } from './get-youtube-id';

export class MediaUtil {
  processThumbnailVideo(media: MediaDto): MediaDto {
    if (
      media?.type == MediaType.VIDEO &&
      media?.source == VideoLinkSources.YOUTUBE
    ) {
      const videoLinks = media?.source;
      media.source = videoLinks;

      const youtubeId = getYouTubeId(media?.url);
      media.thumbnail = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
    } else if (media?.type == MediaType.VIDEO && !media.thumbnail) {
      media.thumbnail = ZPORTER_DEFAULT_IMAGE;
    }

    return {
      type: media.type,
      url: media.url,
      source: media?.source || '',
      thumbnail: media?.thumbnail || '',
      uniqueKey: media?.uniqueKey || '',
    } as MediaDto;
  }
}
