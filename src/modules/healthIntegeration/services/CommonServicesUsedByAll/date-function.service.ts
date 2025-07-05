import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthServiceDate {
  getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
