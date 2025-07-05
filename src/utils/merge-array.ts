import {
  DataChartByDateRange,
  DaysArray,
} from '../modules/dashboard/dto/dashboard.req.dto';

export const mergeArray = (
  arr1: DaysArray[],
  arr2: DataChartByDateRange[],
): DaysArray[] => {
  const map = new Map();
  arr1.forEach((item) => map.set(item.day, item));
  arr2.forEach((item) => map.set(item.day, { ...map.get(item.day), ...item }));
  const mergedArr = Array.from(map.values());
  return mergedArr;
};
