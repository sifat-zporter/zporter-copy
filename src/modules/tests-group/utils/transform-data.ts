import { groupBy, map, flatMap, capitalize } from 'lodash';
import { Subtype } from '../../tests/repository/subtype/subtype';
import { TestCategory } from '../types';
import { Metric } from '../../tests/enums/metric';

function camelCase(str: string): string {
  if (!str) return '';

  return str
    .split(/[\s-_]+/)
    .map((word, index) => {
      if (index === 0) return word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const whole = word.replace(/[^a-zA-Z0-9]/g, '');
      return whole.charAt(0).toUpperCase() + whole.slice(1).toLowerCase();
    })
    .join('');
}

function formatMetric(metric: Metric): string {
  if (!metric) return '';

  if (metric === Metric.SECOND) return 'ss:mm';
  if (metric === Metric.MINUTE || metric === Metric.MILIMETER) return 'mm:ss';
  return metric;
}

export function transformSubtypeToCategory(
  subtypes: Subtype[],
): TestCategory[] {
  const groupedSubtypes = groupBy(subtypes, 'testType');
  const arr = Object.keys(groupedSubtypes).map((key) => ({
    [key]: groupedSubtypes[key],
  }));
  return map(arr, (obj) => {
    const key = Object.keys(obj)[0];
    return {
      label: capitalize(key.toLowerCase()),
      data: flatMap(obj[key]?.map((subtype) => subtype.tests))?.map((test) => ({
        id: camelCase(test.testName),
        label: test.testName,
        metric: formatMetric(test.metric),
        media: test.media?.map((m) => m.url),
      })),
    };
  });
}
