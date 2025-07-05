import {
  splitDateByMonths,
  splitRangeDate,
} from '../common/constants/common.constant';
import { DaysArray } from '../modules/dashboard/dto/dashboard.req.dto';
import {
  LastDateRange,
  LastMonthRange,
} from '../modules/dashboard/enum/dashboard-enum';

export const splitDate = (
  data: DaysArray[],
  lastDateRange: LastDateRange,
): DaysArray[] => {
  const newData: DaysArray[] = [];
  let index = 0;

  while (data.length > 0) {
    const splitDays = data.splice(0, splitRangeDate[lastDateRange].split);
    const totalValue = splitDays.filter((e) => e.value > 0).length || 1;

    const averageData = Math.round(
      splitDays.reduce((ac, a) => a.value + ac, 0) / totalValue,
    );

    newData.push({
      index,
      value: averageData,
      day: `${splitDays[0].day} - ${splitDays[splitDays.length - 1].day}`,
    });
    index++;
  }
  return newData;
};

export const splitDateByMonth = (
  data: DaysArray[],
  lastMonthRange: LastMonthRange,
) => {
  const newData: DaysArray[] = [];
  let index = 0;

  while (data.length > 0) {
    const splitDays = data.splice(0, splitDateByMonths[+lastMonthRange].split);
    const totalValue = splitDays.filter((e) => e.value > 0).length || 1;

    const averageData = Math.round(
      splitDays.reduce((ac, a) => a.value + ac, 0) / totalValue,
    );

    newData.push({
      index,
      value: averageData,
      day: `${splitDays[0].day} - ${splitDays[splitDays.length - 1].day}`,
    });
    index++;
  }
  return newData;
};
