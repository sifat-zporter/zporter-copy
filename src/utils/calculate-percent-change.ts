export const calculatePercentChanged = (
  originalNumber: number,
  newNumber: number,
): number => {
  if (originalNumber === 0 && newNumber === 0) {
    return 0;
  }

  originalNumber === 0 ? (originalNumber = 1) : originalNumber;

  if (newNumber > originalNumber) {
    return Math.round(((newNumber - originalNumber) / originalNumber) * 100);
  }

  return -Math.round(((originalNumber - newNumber) / originalNumber) * 100);
};
