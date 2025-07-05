import { TestLevel } from '../../../enums/test-level';

export class NodeChart {
  index: number = 0;

  point: number = 0;
  value?: number = 0;
  level: TestLevel = TestLevel.AMATEUR;
  day: string = '';

  constructor();
  constructor(nodeChart?: Partial<NodeChart>);
  constructor(...args: any[]) {
    if (!args.length) {
      return this;
    }
    return Object.assign(this, args[0]);
  }
}
