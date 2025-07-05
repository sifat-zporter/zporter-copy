import { mappingUserInfoById } from '../helpers/mapping-user-info';
import { MatchInTotalStatisticDto } from '../modules/dashboard/dto/dashboard.res.dto';
import { UserTypes } from '../modules/users/enum/user-types.enum';

export const calculateMostVotesOfZtar = async (userId: string) => {
  const { type, email } = await mappingUserInfoById(userId);

  if (email === 'nicklasj68@gmail.com') {
    return 1000;
  }

  switch (type) {
    case UserTypes.COACH:
      return 30;

    default:
      return 5;
  }
};

export const calculateZtarOfTheMatch = (
  matchInTotalStatistic: MatchInTotalStatisticDto,
) => {
  let value = 0;

  const { assists, goals, hours, matchLosses, matchWins, red, yel } =
    matchInTotalStatistic;

  Object.entries(matchInTotalStatistic).forEach((e) => {
    switch (e[0]) {
      case 'assists':
        return (value += assists * 10);
      case 'goals':
        return (value += goals * 20);
      case 'hours':
        return (value += hours * 0.1);
      case 'matchWins':
        return (value += matchWins * 30);
      case 'matchLosses':
        return (value += matchLosses * -20);
      case 'red':
        return (value += red * -50);
      case 'yel':
        return (value += yel * -20);
    }
  });

  return value;
};
