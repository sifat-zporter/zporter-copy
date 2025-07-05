export const generateNewHeadline = (headline: string, index: number) => {
  if (!index) return `Copy of (${headline})`;
  return `Copy of (${headline})(${index})`;
};

export const generateIndex = (arr: any[]): number => {
  for (var i = 0; i <= arr.length; i++) {
    if (i !== arr[i]?.index) return i;
  }
};
