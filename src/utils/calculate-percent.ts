const calculateTotal = (arr) => {
  return arr.reduce((acc, cur) => {
    return (acc += cur);
  }, 0);
};

export const calculatePercent = (arr: number[]) => {
  //Calculate total
  const total = calculateTotal(arr);

  // Calculate each el except last el
  const rest = [...arr.slice(0, -1)].map(
    (x) => Math.round((x / total) * 100) || 0,
  );

  // Calculate total percent of arr.length-1 el
  const totalRest = calculateTotal(rest);

  // Calculate the last el percent
  const lastEl = arr.slice(-1).pop();

  const last =
    totalRest > 0 && totalRest < 100
      ? 100 - totalRest
      : Math.round((lastEl / total) * 100 || 0);
  rest.push(last);
  return rest;
};
