export class PipelineDto<T> {
  public match?: {
    [key in keyof T]?: any | [any] | ConditionObject;
  };
  public project?: { [key in keyof T]?: 1 | 0 };
  public keySort?: Record<string, 1 | -1 | { $meta: 'textScore' }>;
  public page?: number;
  public pageSize?: number;
  public group?: { [key in keyof T]?: 1 | 0 };

  constructor(
    $match: { [key in keyof T]: any | [any] | ConditionObject },
    $project: { [key in keyof T]: 1 | 0 },
    $keySort: Record<string, 1 | -1 | { $meta: 'textScore' }>,
    $page: number,
    $pageSize: number,
  ) {
    this.match = $match;
    this.project = $project;
    this.keySort = $keySort;
    this.page = $page;
    this.pageSize = $pageSize;
  }
}

type Operators = {
  $lt: any;
  $gt: any;
  $lte: any;
  $gte: any;
  $eq: any;
  $ne: any;
  $expr: any;
};
export type ConditionObject = {
  // const operators: string[] = ['$lt', '$gt', '$lte', '$gte', '$ne'];

  // operator: '$lt' | '$gt' | '$lte' | '$gte' | '$ne' | any;
  // value: any;
  [key in keyof Operators]?: any;
  // public [key in keyof Operators ]: any;

  // constructor(
  //   operator: '$lt' | '$gt' | '$lte' | '$gte' | '$ne' | any,
  //   value: any,
  // ) {
  //   this.operator = operator;
  //   this.value = value;
  // }
};
