import * as moment from 'moment';

type PeriodTimeResponse  = {
	fromTime: number;
	toTime: number;
}
 
export function getPeriodTimeForQuery(pointOfTime: number) {
	if( !pointOfTime ) {
		const result: PeriodTimeResponse = {
			fromTime: +moment.utc().subtract(2, 'd').format('x'),
			toTime: +moment.utc().format('x'),
		}
		return result
	}
	else {
		for (let index = 0; index < 30; index++) {
			const daysPerStep = 2;

			const toTime = +moment.utc().subtract( (index*daysPerStep), 'd').format('x');
			const fromTime = +moment.utc().subtract( (index+1)*daysPerStep, 'd').format('x');

			if ( fromTime < pointOfTime && pointOfTime <= toTime ) {
				const result: PeriodTimeResponse = {
					fromTime,
					toTime: pointOfTime,
				};
				return result;
			}

		}
		const result: PeriodTimeResponse = {
			fromTime: null,
			toTime: null,
		};
		return result; 
	}
}
