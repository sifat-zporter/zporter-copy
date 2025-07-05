import {
  ValidationOptions,
  buildMessage,
  registerDecorator,
  isInt,
} from 'class-validator';

import mongoose from 'mongoose';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export function isObjectId(id: string): boolean {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    new mongoose.Types.ObjectId(id).toString() === id
  );
}

export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isObjectId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (isObjectId(value)) {
            return true;
          } else {
            return false;
          }
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be an object id',
          validationOptions,
        ),
      },
    });
  };
}

export function IsIntMin(_v: number, validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsIntMin',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return !!(Number(value) >= _v);
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + `$property must not be less than ${_v}`,
          validationOptions,
        ),
      },
    });
  };
}

export function IsIntNumber(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isIntNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value === 'string' && value.trim() === '') return false; // handle SPECIAL CHARACTERS '+'

          if (isInt(Number(value))) {
            return true;
          } else {
            return false;
          }
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be an integer number',
          validationOptions,
        ),
      },
    });
  };
}

@Injectable()
export class IdPipe implements PipeTransform {
  transform(value: any) {
    if (!isObjectId(value)) {
      throw new BadRequestException('Id must be an object id');
    }
    return value;
  }
}
