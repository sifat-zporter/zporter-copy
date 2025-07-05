export const mappedDataByDate = (arr) => {
  const finalObj = {};
  arr.forEach((data) => {
    try {
      const date = data.day;
      if (finalObj[date]) {
        finalObj[date].push(data);
      } else {
        finalObj[date] = [data];
      }
    } catch (error) {}
  });
  return Object.keys(finalObj).map((date) => {
    return {
      date,
      values: finalObj[date],
    };
  });
};
