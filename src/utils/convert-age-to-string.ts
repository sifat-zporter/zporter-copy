export const convertAgeToString = (age: number): string => {
  if (age === 0 || age === 1 || age === 100) return 'All';
  return age.toString();
};
