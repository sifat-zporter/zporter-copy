import { painLevel } from '../common/constants/common.constant';
import { InjuryDto } from '../modules/diaries/dto/injury.dto';

export const formatInjuryBodyPart = (injuries: InjuryDto[]) => {
  const finalObj = {};
  injuries.forEach((data) => {
    const area = data?.injuryArea;
    if (finalObj[area]) {
      finalObj[area].push(data);
    } else {
      finalObj[area] = [data];
    }
  });

  const bodyChart = Object.keys(finalObj).map((area) => {
    let painLevelPoints = 0;
    let isFront: boolean;
    finalObj[area].forEach((value) => {
      painLevelPoints = Math.max(painLevel[value?.painLevel]) || 0;
      isFront = value.isFront;
    });

    return {
      injuryArea: area,
      value: painLevelPoints,
      isFront,
      total: finalObj[area].length,
      description: injuries[0]?.description || '',
    };
  });

  return bodyChart;
};
