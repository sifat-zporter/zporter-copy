export const updateDiaryMatchBody = {
  energyLevel: 'VERY_BAD',
  eatAndDrink: 'VERY_BAD',
  sleep: 'VERY_BAD',
  typeOfDiary: 'MATCH',
  match: {
    dateTime: 'string',
    country: {
      alpha2Code: 'string',
      alpha3Code: 'string',
      name: 'string',
      flag: 'string',
      region: 'string',
    },
    typeOfGame: 'SERIES',
    length: 0,
    place: 'HOME',
    club: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    yourTeam: 'string',
    opponentClub: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    opponentTeam: 'string',
    arena: 'string',
    result: {
      yourTeam: 0,
      opponents: 0,
    },
    stats: [
      {
        minutesPlayed: 0,
        role: 'GK',
      },
    ],
    events: [
      {
        minutes: 0,
        event: 'RED_CARD',
      },
    ],
    review: {
      physicallyStrain: 'VERY_LOW',
      performance: 'VERY_BAD',
      yourReview: 'string',
    },
    matchMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
  },
  injuries: {
    description: 'string',
    treatment: 'string',
    painLevel: 'VERY_LOW',
    injuryTags: ['string'],
    injuryMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
    injuryArea: 'B-R-Head',
    injuryPosition: {
      x: 0,
      y: 0,
    },
    isFront: true,
  },
};

export const updateDiaryTrainingBody = {
  energyLevel: 'VERY_BAD',
  eatAndDrink: 'VERY_BAD',
  sleep: 'VERY_BAD',
  typeOfDiary: 'TRAINING',
  training: {
    physicallyStrain: 'VERY_LOW',
    hoursOfPractice: 0,
    technics: 0,
    tactics: 0,
    physics: 0,
    mental: 0,
    practiceTags: ['string'],
    typeOfTraining: 'REST_DAY',
    trainingMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
  },
  injuries: {
    description: 'string',
    treatment: 'string',
    painLevel: 'VERY_LOW',
    injuryTags: ['string'],
    injuryMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
    injuryArea: 'B-R-Head',
    injuryPosition: {
      x: 0,
      y: 0,
    },
    isFront: true,
  },
};

export const createDiaryTrainingBody = {
  energyLevel: 'VERY_BAD',
  eatAndDrink: 'VERY_BAD',
  sleep: 'VERY_BAD',
  typeOfDiary: 'TRAINING',
  training: {
    physicallyStrain: 'VERY_LOW',
    hoursOfPractice: 0,
    technics: 0,
    tactics: 0,
    physics: 0,
    mental: 0,
    practiceTags: ['string'],
    typeOfTraining: 'REST_DAY',
    trainingMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
  },
  injuries: {
    description: 'string',
    treatment: 'string',
    painLevel: 'VERY_LOW',
    injuryTags: ['string'],
    injuryMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
    injuryPosition: {
      x: 0,
      y: 0,
    },
    isFront: true,
    injuryArea: 'B-R-Head',
  },
};

export const createDiaryMatchBody = {
  energyLevel: 'VERY_BAD',
  eatAndDrink: 'VERY_BAD',
  sleep: 'VERY_BAD',
  typeOfDiary: 'MATCH',
  match: {
    dateTime: 'string',
    country: {
      alpha2Code: 'string',
      alpha3Code: 'string',
      name: 'string',
      flag: 'string',
      region: 'string',
    },
    typeOfGame: 'SERIES',
    length: 0,
    place: 'HOME',
    club: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    yourTeam: 'string',
    opponentClub: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    opponentTeam: 'string',
    arena: 'string',
    result: {
      yourTeam: 0,
      opponents: 0,
    },
    stats: [
      {
        minutesPlayed: 0,
        role: 'GK',
      },
    ],
    events: [
      {
        minutes: 0,
        event: 'RED_CARD',
      },
    ],
    review: {
      physicallyStrain: 'VERY_LOW',
      performance: 'VERY_BAD',
      yourReview: 'string',
    },
    matchMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
  },
  injuries: {
    description: 'string',
    treatment: 'string',
    painLevel: 'VERY_LOW',
    injuryTags: ['string'],
    injuryMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
    injuryPosition: {
      x: 0,
      y: 0,
    },
    isFront: true,
    injuryArea: 'B-R-Head',
  },
};

export const createDiaryBodyWithNoInjury = {
  energyLevel: 'VERY_BAD',
  eatAndDrink: 'VERY_BAD',
  sleep: 'VERY_BAD',
  typeOfDiary: 'MATCH',
  match: {
    dateTime: 'string',
    country: {
      alpha2Code: 'string',
      alpha3Code: 'string',
      name: 'string',
      flag: 'string',
      region: 'string',
    },
    typeOfGame: 'SERIES',
    length: 0,
    place: 'HOME',
    club: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    yourTeam: 'string',
    opponentClub: {
      clubId: 'string',
      clubName: 'string',
      logoUrl: 'string',
    },
    opponentTeam: 'string',
    arena: 'string',
    result: {
      yourTeam: 0,
      opponents: 0,
    },
    stats: [
      {
        minutesPlayed: 0,
        role: 'GK',
      },
    ],
    events: [
      {
        minutes: 0,
        event: 'RED_CARD',
      },
    ],
    review: {
      physicallyStrain: 'VERY_LOW',
      performance: 'VERY_BAD',
      yourReview: 'string',
    },
    matchMedia: [
      {
        type: 'IMAGE',
        url: 'string',
      },
    ],
  },
};
