import * as moment from 'moment';

export const setOfNearActiveSeasons = (setLength: number) => {
  const a = +moment().endOf('year').format('x');
  const b = +moment().startOf('year').subtract(setLength, 'year').format('x');

  const rangeOfYears = (start, end) =>
    Array(end - start + 1)
      .fill(start)
      .map((year, index) => year + index)
      .sort((a, b) => a - b);

  const startYear = +moment(b).year();
  const endYear = +moment(a).year();

  const rangeYears = rangeOfYears(startYear, endYear);

  // const arraysOfNearActiveSeason = rangeYears.reduce((acc, cur, idx) => {
  //   const range = [];
  //   const a = cur;
  //   const b = rangeYears[idx + 1];
  //   if (a && b) {
  //     range.push(a, b);
  //   }
  //   range.length && acc.push(range);
  //   return acc;
  // }, []);

  return rangeYears;
};
