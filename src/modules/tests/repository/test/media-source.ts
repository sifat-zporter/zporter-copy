import { MediaType } from '../../../diaries/enum/diaries.enum';

export class MediaSource {
  type: MediaType;
  url: string;

  source: string;
  thumbnail: string;
  uniqueKey: string;

  constructor(mediaSource: MediaSource) {
    return Object.assign(this, mediaSource);
  }
}
