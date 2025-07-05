import { painLevel } from '../common/constants/common.constant';

export const calculatePercentPainChartColumn = (
  injuryAreaPart: string[],
  filterByInjuryArea,
) => {
  const data = [];
  injuryAreaPart.forEach((area) => {
    data.push({
      injuryArea: filterByInjuryArea[area] ? area : area,
      value: filterByInjuryArea[area]
        ? filterByInjuryArea[area]
            .map((ar) => ar.painLevel)
            .reduce(function (acc, curr) {
              acc[curr] ? ++acc[curr] * acc[curr] : (acc[curr] = 1);
              return acc;
            }, {})
        : 0,
    });
  });

  data.forEach((d) => {
    d.value = Object.fromEntries(
      Object.entries(d.value).map(([key, value]) => [
        key,
        (value as number) * painLevel[key],
      ]),
    );
  });

  data.forEach((z) => {
    const sum = Object.values(z?.value).reduce((a: number, b: number) => {
      return a + b;
    }, 0);
    z.value = sum || 0;
  });

  const total = data.reduce((acc, { value }) => acc + value, 0);

  const result = data.map((d) => Math.round((d.value / total) * 100) || 0);

  return result;
};
