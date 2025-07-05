export const normalizeTextFormula = (text: string) => {
  return text.replace(/\s/g, '').trim().normalize('NFC');
};

export const trimAndNormalizeText = (text: string) => {
  return text.trim().normalize('NFC');
};
