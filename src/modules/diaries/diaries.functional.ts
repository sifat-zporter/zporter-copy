import * as moment from 'moment';

function fillEmptyTimestamp(from: string, to: string, data: any[]) {
  const unixFrom = +moment.utc(from).format('x');
  const unixTo = +moment.utc(to).format('x');
  const result = [];

  // Create a set of existing timestamps for quick lookup
  const existingTimestamps = new Set(
    data.map((record) => moment.utc(record.createdAt).startOf('day').valueOf()),
  );

  // Iterate through each day in the range
  for (let day = unixFrom; day <= unixTo; day += 86400000) {
    // 86400000 ms in a day
    if (!existingTimestamps.has(day)) {
      result.push({ createdAt: day, typeOfDiary: null });
    }
  }

  // Add existing data to the result
  result.push(...data);

  return result;
}

function filterDuplicateDayRecords(records: any[]): any[] {
  const dayMap = new Map();

  records.forEach((record) => {
    const day = moment(record.createdAt).format('YYYY-MM-DD');
    if (!dayMap.has(day)) {
      dayMap.set(day, record);
    }
  });

  return Array.from(dayMap.values());
}

export { fillEmptyTimestamp, filterDuplicateDayRecords };
