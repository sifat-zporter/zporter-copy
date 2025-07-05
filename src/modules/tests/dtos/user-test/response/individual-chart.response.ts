import { NodeChart } from './chart-node';

export class ChartResponse {
  numberNodes: number = 0;
  nodes: NodeChart[] = [];

  constructor();
  constructor(chart: ChartResponse);
  constructor(...args: any[]) {
    if (!args.length) {
      return this;
    }
    return Object.assign(this, args[0]);
  }
}
