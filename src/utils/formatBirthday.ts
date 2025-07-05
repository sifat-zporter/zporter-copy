export const formatBirthDay = (birthDay: string): string => {
  const dateObject = new Date(birthDay);
  const year = dateObject.getFullYear().toString().substr(2, 2);
  const month = `0${dateObject.getMonth() + 1}`.slice(-2);
  const date = `0${dateObject.getDate()}`.slice(-2);

  return `${year}/${month}/${date}`;
};
