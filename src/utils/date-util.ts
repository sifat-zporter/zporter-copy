import { Injectable, Scope } from '@nestjs/common';
import * as moment from 'moment';
import { LastDateRange } from '../modules/dashboard/enum/dashboard-enum';

@Injectable({ scope: Scope.DEFAULT })
export class DateUtil {
  constructor() {}

  getNowTimeInMilisecond(): number {
    return +moment.utc().format('x');
  }
  getNowDate(): Date {
    return new Date();
  }

  getDateFormat(): string {
    return moment.utc().format('DD MMM YYYY');
  }

  formatDateTimeForUserTest(
    date: string,
    time: string,
    timezone: string,
  ): number {
    const result: number = +moment(
      `${date} - ${time}:00`,
      'DD/MM/YYYY - HH:mm:ss',
    )
      .tz(timezone, true)
      .utc()
      .format('x');

    return isNaN(result) ? this.getNowTimeInMilisecond() : result;
  }

  convertDateToFormat(date: Date, format?: string) {
    return moment(date).format(format);
  }

  convertToDateFormat(milisecond: number, dateFormat: DateFormat) {
    return moment.utc(milisecond).format(dateFormat);
  }

  getArrayDateRangeForChart<
    T extends {
      startTime: number;
      endTime: number;
    },
  >(lastDateRange: LastDateRange, numberPoint: number): T[] {
    let dateRange =
      lastDateRange == LastDateRange.ALL
        ? 1825 // 5 years = 1825 days
        : +lastDateRange;

    const dayPerStep: number = Math.round(+dateRange / numberPoint);
    const timeRanges = [];

    for (let index = 0; index < numberPoint; index++) {
      const from: number = +moment
        .utc()
        .subtract(dateRange, 'day')
        .add(index * dayPerStep, 'day')
        .format('x');
      const to: number = +moment.utc(from).add(dayPerStep, 'day').format('x');

      const period = {
        startTime: from,
        endTime: to,
      };
      timeRanges.push(period);
    }
    return timeRanges;
  }

  getRangeTime(lastDateRange: LastDateRange): {
    startTime: number;
    endTime: number;
  } {
    const startTime: number =
      lastDateRange == LastDateRange.ALL
        ? 0
        : +moment
            .utc()
            .subtract(+lastDateRange, 'd')
            .startOf('day')
            .format('x');
    const endTime: number = +moment.utc().format('x');

    return {
      startTime,
      endTime,
    };
  }
}

export enum DateFormat {
  MM_DD_YYYY = 'MM-DD-YYYY',
}
