import { DataChartByDateRange } from '../modules/dashboard/dto/dashboard.req.dto';

export const aggregateSumByDate = (arr: DataChartByDateRange[]) => {
  return arr.reduce(
    (acc: DataChartByDateRange[], next: DataChartByDateRange) => {
      const lastItemIndex = acc.length - 1;
      const accHasContent = acc.length >= 1;

      if (accHasContent && acc[lastItemIndex].day == next.day) {
        acc[lastItemIndex].value += next.value;
      } else {
        acc[lastItemIndex + 1] = next;
      }
      return acc;
    },
    [],
  );
};
