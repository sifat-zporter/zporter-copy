export const getContentByFrequencyUpdateDiary = (frequencyNum: number) => {
  const contentByFrequency = [
    {
      frequency: 0,
      content: '7d now since you updated your diary',
    },
    {
      frequency: 1,
      content: '1 of 7 you can do better!',
    },
    {
      frequency: 2,
      content: '2 of 7, you can do better!',
    },
    {
      frequency: 3,
      content: '3 of 7, you can do better!',
    },
    {
      frequency: 4,
      content: '4 of 7, are OK.',
    },
    {
      frequency: 5,
      content: '5 of 7 days are Good.',
    },
    {
      frequency: 6,
      content: '6 of 7 days are Very Good.',
    },
    {
      frequency: 7,
      content: 'Great, 7 days in a row now.',
    },
  ];

  return contentByFrequency.find(({ frequency }) => frequency === frequencyNum)
    .content;
};
