import { TrendArrowsBioStats } from '../modules/biography/enum/trend-arrows-bio.enum';

export enum PercentChange {
  Increase = 'Increase',
  Decrease = 'Decrease',
  Same = 'Same',
}

export interface ChangeValue {
  value: number;
  type: PercentChange;
}

export function comparePercentChanges(
  newNumber: number,
  currentNumber: number,
) {
  const change = {
    value: 0,
    type: PercentChange.Same,
  };

  if (newNumber === currentNumber) {
    return change;
  }

  if (newNumber < currentNumber) {
    change.type = PercentChange.Decrease;
  } else {
    change.type = PercentChange.Increase;
  }

  change.value = ((newNumber - currentNumber) / currentNumber) * 100;

  return change;
}

export function calculateArrow(change: ChangeValue) {
  if (change.type === PercentChange.Increase) {
    if (change.value >= 50) {
      return TrendArrowsBioStats.VERY_STRONG;
    }
    return TrendArrowsBioStats.STRONG;
  }

  if (change.type === PercentChange.Decrease) {
    if (change.value < -50) {
      return TrendArrowsBioStats.VERY_BAD;
    }
    return TrendArrowsBioStats.BAD;
  }

  return TrendArrowsBioStats.NEUTRAL;
}
