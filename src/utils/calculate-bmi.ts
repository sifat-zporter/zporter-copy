export const calculateBMI = (weight: number, height: number) => {
  return Math.ceil((weight / height / height) * 10000);
};
