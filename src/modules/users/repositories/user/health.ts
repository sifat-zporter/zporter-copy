export class Health {
  height: HealthUpdate;
  leftFootLength: number;
  rightFootLength: number;
  weight: HealthUpdate;
}
class HealthUpdate {
  updatedAt: string;
  value: number;
}
