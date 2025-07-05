import * as moment from 'moment';
import { DaysArray } from '../modules/dashboard/dto/dashboard.req.dto';

export const getDaysArray = (
  startDate: number,
  stopDate: number,
): DaysArray[] => {
  let index = 0;
  const dateArray = [];
  let currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push({
      index,
      value: 0,
      day: moment.utc(currentDate).format('YYYY-MM-DD'),
    });
    currentDate = +moment.utc(currentDate).add(1, 'days');
    index++;
  }
  return dateArray;
};
