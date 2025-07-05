export const removeDuplicatedElement = <T>(array: T[]) => {
  let seen = new Set();

  return array.filter((item) => {
    return seen.has(item) ? false : seen.add(item);
  });
};
