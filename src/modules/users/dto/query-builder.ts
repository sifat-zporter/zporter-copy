import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum Query {
  TEAM = 'team',
  FRIEND = 'friend',
}

export class QueryBuilder {
  @ApiProperty({ enum: Query })
  @IsEnum(Query)
  query: Query;
}
