export const calculateBodyFat = (
  breastSkinThickness: number,
  waistSkinsThickness: number,
  thighSkinThickness: number,
) => {
  // const women = 5.4;
  // const men = 16.2;
  // const numeric = gender === GenderTypes.Female ? women : men;

  // return Math.ceil(1.2 * bmi + 0.23 * age - (numeric || 0));
  return Math.ceil(
    (breastSkinThickness + waistSkinsThickness + thighSkinThickness) / 3,
  );
};
