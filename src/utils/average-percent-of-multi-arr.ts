export const averagePercentOfMultiArr = (arr) => {
  const emptyData = [0, 0, 0, 0, 0, 0, 0, 0];
  const areaF = [];
  const areaB = [];

  arr.filter((x) => areaB.push(x.injuryAreaB));
  arr.filter((x) => areaF.push(x.injuryAreaF));

  const B =
    areaB[0] &&
    areaB[0].map((x, idx) =>
      areaB.reduce((sum, curr) => sum + curr[idx] || 0, 0),
    );

  const F =
    areaF[0] &&
    areaF[0].map((x, idx) =>
      areaF.reduce((sum, curr) => sum + curr[idx] || 0, 0),
    );

  const totalB = B && B.reduce((acc, curr) => acc + curr);
  const totalF = F && F.reduce((acc, curr) => acc + curr);

  const injuryAreaB =
    (B && B.map((x) => Math.round((x / totalB) * 100) || 0)) || emptyData;
  const injuryAreaF =
    (F && F.map((x) => Math.round((x / totalF) * 100) || 0)) || emptyData;

  return { injuryAreaF, injuryAreaB };
};
