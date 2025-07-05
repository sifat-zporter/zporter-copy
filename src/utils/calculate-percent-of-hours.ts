const calculateTotal = (arr: number[]) => {
  return arr.reduce((acc, cur) => {
    return (acc += cur);
  }, 0);
};

export const calculatePercentOfHours = (arr: number[], hours: number) => {
  const round = 1.0 / 0.5;

  const rest = [...arr.slice(0, -1)].map(
    (x) => Math.round((x / 100) * hours * round) / round || 0,
  );

  const totalRest = calculateTotal(rest);

  const lastEl = arr.slice(-1).pop();

  const last =
    totalRest > 0 && totalRest < hours
      ? hours - totalRest
      : Math.round((lastEl / 100) * hours * round) / round || 0;
  rest.push(last);
  return rest;
};

export const calculateMinutesOfHours = (arr: number[], hours: number) => {
  const hourToSecond = hours * 60;

  const rest = [...arr.slice(0, -1)].map(
    (x) => Math.round((x / 100) * hourToSecond) || 0,
  );

  const totalRest = calculateTotal(rest);

  const lastEl = arr.slice(-1).pop();

  if (lastEl === 0 && totalRest > hourToSecond) {
    const overbalance = totalRest - hourToSecond;
    const max = Math.max(...rest);
    const index = rest.findIndex((x) => x === max);
    rest[index] = max - overbalance;
  }

  const last =
    totalRest > 0 && totalRest < hourToSecond
      ? hourToSecond - totalRest
      : Math.round((lastEl / 100) * hourToSecond) || 0;

  rest.push(last);

  return rest;
};
