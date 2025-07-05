import { GetBioUrl } from '../modules/biography/interfaces/get-bio.url.interface';
import { UserTypes } from '../modules/users/enum/user-types.enum';

export const getBioUrl = (getBioUrl: GetBioUrl) => {
  const { username, type, firstName, lastName } = getBioUrl;

  let typePrefix = 'player';

  if (type === UserTypes.PLAYER) {
    typePrefix = 'player';
  }
  if (type === UserTypes.COACH) {
    typePrefix = 'coach';
  }
  if (type === UserTypes.SUPPORTER) {
    typePrefix = 'supporter';
  }

  let firstLastNameUrl: string;

  firstLastNameUrl =
    lastName == undefined || lastName == null || lastName == ''
      ? `${firstName}`
          .normalize('NFC')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s/g, '')
          .toLowerCase()
      : `${firstName}.${lastName}`
          .normalize('NFC')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s/g, '')
          .toLowerCase();

  return `${process.env.WEB_BASE_URL}/${typePrefix}/${username}/${firstLastNameUrl}`;
};
