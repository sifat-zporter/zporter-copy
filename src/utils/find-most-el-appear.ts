export const findMostElementAppear = (arr) => {
  return [
    ...arr.reduce((op, currentValue) => {
      op.set(currentValue, (op.get(currentValue) || 0) + 1);
      return op;
    }, new Map()),
  ].sort((a, b) => b[1] - a[1])[0][0];
};
