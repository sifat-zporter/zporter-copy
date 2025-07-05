/* eslint-disable @typescript-eslint/ban-types */
import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectMapper {
  convertValue<T extends Object, U extends Object>(
    fromObject: T,
    toObject: U,
  ): U {
    const resultObject: U = JSON.parse(JSON.stringify(toObject));
    Object.keys(toObject).forEach((e) => {
      if (
        e in fromObject
        // &&
        // typeof toObject[`${e}`] == typeof fromObject[`${e}`]
      ) {
        resultObject[`${e}`] = fromObject[`${e}`];
      }
    });
    return resultObject;
  }

  convertValueCheckType<T extends Object, U extends Object>(
    fromObject: T,
    toObject: U,
    optionalObject?: Partial<U>,
  ): U {
    const resultObject: U = JSON.parse(JSON.stringify(toObject));
    Object.keys(resultObject).forEach((e) => {
      if (
        e in fromObject
        // &&
        // typeof toObject[`${e}`] == typeof fromObject[`${e}`]
      ) {
        resultObject[`${e}`] = fromObject[`${e}`];
      }
    });
    return {
      ...resultObject,
      ...optionalObject,
    };
  }
}
