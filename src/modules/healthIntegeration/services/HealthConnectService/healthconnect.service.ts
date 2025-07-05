import { Injectable } from '@nestjs/common';
import { ActiveCaloriesBurnedRecordDto } from '../../dto/GoogleConnect/ActiveCaloriesBurnedRecord.dto';
import { db } from '../../../../config/firebase.config';
import { BasalMetabolicRateRecordDto } from '../../dto/GoogleConnect/BasicMetabolicRateRecord.dto';
import { BloodPressureRecordDto } from '../../dto/GoogleConnect/blood-pressure.dto';
import { HealthConnectServiceCaloriesBurned } from './InnerHealthConnectService/HealthConnectstoreActiveCaloriesBurned.service';
import { BasalMetabolicRate } from './InnerHealthConnectService/BasalMetabolicRate.service';
import { BloodPressure } from './InnerHealthConnectService/BloodPressure.service';
import { CyclingPedalingCadenceRecordDto } from '../../dto/GoogleConnect/CyclingPedalingCadenceRecord.dto';
import { CadenceRecord } from './InnerHealthConnectService/CyclingPedalingCadenceRecord.service';
import { Distance } from './InnerHealthConnectService/Distance.service';
import { DistanceRecordDto } from '../../dto/GoogleConnect/DistanceRecord.dto';
import { ElevationGainedRecordDto } from '../../dto/GoogleConnect/ElevationGainedRecord.dto';
import { HealthConnectServiceElevationGained } from './InnerHealthConnectService/ElevationGained.service';
import { ExerciseSessionRecordDto } from '../../dto/GoogleConnect/ExcerciseSessionRecord.dto';
import { ExerciseSession } from './InnerHealthConnectService/ExerciseSession.service';
import { FloorsClimbedRecordDto } from '../../dto/GoogleConnect/FloorClimbedRecord.dto';
import { HealthConnectServiceFloorsClimbed } from './InnerHealthConnectService/FloorsClimbed.service';
import { HeartRateRecordDto } from '../../dto/GoogleConnect/HeartRate.dto';
import { HealthConnectServiceHeartRate } from './InnerHealthConnectService/HeartRate.service';
import { HeightRecordDto } from '../../dto/GoogleConnect/HeightRecord.dto';
import { HealthConnectServiceHeight } from './InnerHealthConnectService/Height.service';
import { HydrationRecordDto } from '../../dto/GoogleConnect/HydrationRcord.dto';
import { HydrationService } from './InnerHealthConnectService/Hydration.service';
import { MindfulnessSessionRecordDto } from '../../dto/GoogleConnect/MindFullSsessionRecord.dto';
import { HealthConnectServiceMindfulness } from './InnerHealthConnectService/MindfullSessioin.service';
import { NutritionRecordDto } from '../../dto/GoogleConnect/NutritionRecord.dto';
import { PowerRecordDto } from '../../dto/GoogleConnect/PowerRecord.dto';
import { RestingHeartRateRecordDto } from '../../dto/GoogleConnect/RestingHeartRateRecord.dto';
import { SkinTemperatureRecordDto } from '../../dto/GoogleConnect/SkinTemperatureRecord.dto';
import { SleepSessionRecordDto } from '../../dto/GoogleConnect/SleepSessionRecord.dto';
import { SpeedRecordDto } from '../../dto/GoogleConnect/SpeedRecord.dto';
import { StepsRecordDto } from '../../dto/GoogleConnect/StepsRecord.dto';
import { StepsCadenceRecordDto } from '../../dto/GoogleConnect/StepsCadenceRecord.dto';
import { TotalCaloriesBurnedRecordDto } from '../../dto/GoogleConnect/TotalCaloriesBurnedRecord.dto';
import { WeightRecordDto } from '../../dto/GoogleConnect/WeightRecord.dto';
import { NutritionService } from './InnerHealthConnectService/Nutritional.service';
import { HealthConnectServicePower } from './InnerHealthConnectService/Power.service';
import { HealthConnectServiceRestingHeartRate } from './InnerHealthConnectService/RestingHeartRate.service';
import { HealthConnectServiceSkinTemperature } from './InnerHealthConnectService/SkinTemperature.service';
import { HealthConnectServiceSleepSession } from './InnerHealthConnectService/SleepSession.service';
import { HealthConnectServiceSpeed } from './InnerHealthConnectService/Speed.service';
import { HealthConnectServiceSteps } from './InnerHealthConnectService/Steps.service';
import { HealthConnectServiceStepsCadence } from './InnerHealthConnectService/StepsCadence.service';
import { HealthConnectServiceTotalCaloriesBurned } from './InnerHealthConnectService/TotalCaloriesBurned.service';
import { HealthConnectServiceWeight } from './InnerHealthConnectService/weight.service';
import { WheelchairPushesRecordDto } from '../../dto/GoogleConnect/WheelChairPushesRecord.dto';
import { HealthConnectServiceWheelchairPushes } from './InnerHealthConnectService/WheelChairPushes.service';

@Injectable()
export class HealthConnectService {
  constructor(
    private readonly storeCaloriesBurned: HealthConnectServiceCaloriesBurned,
    private readonly basalMetabolicRate: BasalMetabolicRate,
    private readonly bloodPressure: BloodPressure,
    private readonly cyclingCadence: CadenceRecord,
    private readonly distance: Distance,
    private readonly elevation: HealthConnectServiceElevationGained,
    private readonly exercise: ExerciseSession,
    private readonly floorsClimbed: HealthConnectServiceFloorsClimbed,
    private readonly heartRate: HealthConnectServiceHeartRate,
    private readonly height: HealthConnectServiceHeight,
    private readonly hydration: HydrationService,
    private readonly mindFullsession: HealthConnectServiceMindfulness,
    private readonly nutrition: NutritionService,
    private readonly power: HealthConnectServicePower,
    private readonly restingHeartRate: HealthConnectServiceRestingHeartRate,
    private readonly skinTemperature: HealthConnectServiceSkinTemperature,
    private readonly sleepSession: HealthConnectServiceSleepSession,
    private readonly speed: HealthConnectServiceSpeed,
    private readonly steps: HealthConnectServiceSteps,
    private readonly stepsCadence: HealthConnectServiceStepsCadence,
    private readonly totalCaloriesBurned: HealthConnectServiceTotalCaloriesBurned,
    private readonly weight: HealthConnectServiceWeight,
    private readonly wheelChair: HealthConnectServiceWheelchairPushes,
  ) {}
  async storeActiveCaloriesBurned(
    userId: string,
    dto: ActiveCaloriesBurnedRecordDto,
  ) {
    return this.storeCaloriesBurned.storeActiveCaloriesBurned(userId, dto);
  }
  async getActiveCaloriesBurned(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.storeCaloriesBurned.getActiveCaloriesBurned(userId, {
      date,
      recordId,
    });
  }
  async deleteActiveCaloriesBurned(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.storeCaloriesBurned.deleteActiveCaloriesBurned(userId, {
      date,
      recordId,
    });
  }
  //===============basla metablic reate====================
  async storeBasalMetabolicRate(
    userId: string,
    dto: BasalMetabolicRateRecordDto,
  ) {
    return this.basalMetabolicRate.storeBasalMetabolicRate(userId, dto);
  }
  async getBasalMetabolicRate(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.basalMetabolicRate.getBasalMetabolicRate(userId, {
      date,
      recordId,
    });
  }
  async deleteBasalMetabolicRate(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.basalMetabolicRate.deleteBasalMetabolicRate(userId, {
      date,
      recordId,
    });
  }
  //==============store blood pressure====================
  async storeBloodPressure(userId: string, dto: BloodPressureRecordDto) {
    return this.bloodPressure.storeBloodPressure(userId, dto);
  }
  async getBloodPressure(userId: string, date?: string, recordId?: string) {
    return this.bloodPressure.getBloodPressure(userId, {
      date,
      recordId,
    });
  }
  async deleteBloodPressure(userId: string, date?: string, recordId?: string) {
    return this.bloodPressure.deleteBloodPressure(userId, {
      date,
      recordId,
    });
  }
  //================store cycling cadence==================
  async storeCyclingCadence(
    userId: string,
    dto: CyclingPedalingCadenceRecordDto,
  ) {
    return this.cyclingCadence.storeCyclingCadence(userId, dto);
  }

  async getCyclingCadence(userId: string, date?: string, recordId?: string) {
    return this.cyclingCadence.getCyclingCadence(userId, {
      date,
      recordId,
    });
  }

  async deleteCyclingCadence(userId: string, date?: string, recordId?: string) {
    return this.cyclingCadence.deleteCyclingCadence(userId, {
      date,
      recordId,
    });
  }

  ///===============store distacne====================
  async storeDistanceRecord(userId: string, dto: DistanceRecordDto) {
    return this.distance.storeDistanceRecord(userId, dto);
  }
  async getDistanceRecord(userId: string, date?: string, recordId?: string) {
    return this.distance.getDistanceRecord(userId, {
      date,
      recordId,
    });
  }

  async deleteDistanceRecord(userId: string, date?: string, recordId?: string) {
    return this.distance.deleteDistanceRecord(userId, {
      date,
      recordId,
    });
  }

  //================store elevation====================
  async storeElevationGained(userId: string, dto: ElevationGainedRecordDto) {
    return this.elevation.storeElevationGained(userId, dto);
  }
  async getElevationGainedRecord(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.elevation.getElevationGainedRecord(userId, {
      date,
      recordId,
    });
  }
  async deleteElevationGained(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.elevation.deleteElevationGainedRecord(userId, {
      date,
      recordId,
    });
  }

  //=================store excercie session==============
  async storeExerciseSession(userId: string, dto: ExerciseSessionRecordDto) {
    return this.exercise.storeExerciseSession(userId, dto);
  }
  async getExerciseSessions(userId: string, date?: string, recordId?: string) {
    return this.exercise.getExerciseSessions(userId, { date, recordId });
  }
  async deleteExerciseSession(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.exercise.deleteExerciseSession(userId, { date, recordId });
  }
  //==================store floors climbed==============
  async storeFloorsClimbed(userId: string, dto: FloorsClimbedRecordDto) {
    return this.floorsClimbed.storeFloorsClimbed(userId, dto);
  }
  async getFloorsClimbedRecord(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.floorsClimbed.getFloorsClimbedRecord(userId, {
      date,
      recordId,
    });
  }
  async deleteFloorsClimbed(userId: string, date?: string, recordId?: string) {
    return this.floorsClimbed.deleteFloorsClimbedRecord(userId, {
      date,
      recordId,
    });
  }

  //================store heart rate===================
  async storeHeartRate(userId: string, dto: HeartRateRecordDto) {
    return this.heartRate.storeHeartRateRecord(userId, dto);
  }
  async getHeartRateRecord(userId: string, date?: string, recordId?: string) {
    return this.heartRate.getHeartRateRecord(userId, { date, recordId });
  }
  async deleteHeartRate(userId: string, date?: string, recordId?: string) {
    return this.heartRate.deleteHeartRateRecord(userId, { date, recordId });
  }

  //===================store height======================
  async storeHeight(userId: string, dto: HeightRecordDto) {
    return this.height.storeHeightRecord(userId, dto);
  }
  async getHeight(userId: string, date?: string, recordId?: string) {
    return this.height.getHeight(userId, { date, recordId });
  }
  async deleteHeight(userId: string, date?: string, recordId?: string) {
    return this.height.deleteHeight(userId, { date, recordId });
  }

  //==================store hydration====================
  async storeHydration(userId: string, dto: HydrationRecordDto) {
    return this.hydration.storeHydrationData(userId, dto);
  }
  async getHydration(userId: string, date?: string, recordId?: string) {
    return this.hydration.getHydrationData(userId, { date, recordId });
  }
  async deleteHydration(userId: string, date?: string, recordId?: string) {
    return this.hydration.deleteHydrationData(userId, { date, recordId });
  }
  //====================mindfulnessSession===============
  async storeMindfulnessSession(
    userId: string,
    dto: MindfulnessSessionRecordDto,
  ) {
    return this.mindFullsession.storeMindfulnessSession(userId, dto);
  }
  async getMindfulnessSession(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.mindFullsession.getMindfulnessSession(userId, {
      date,
      recordId,
    });
  }
  async deleteMindfulnessSession(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.mindFullsession.deleteMindfulnessSession(userId, {
      date,
      recordId,
    });
  }
  //===================nutrition=======================
  async storeNutrition(userId: string, dto: NutritionRecordDto) {
    return this.nutrition.storeNutrition(userId, dto);
  }
  async getNutritionData(userId: string, date?: string, recordId?: string) {
    return this.nutrition.getNutritionData(userId, {
      date,
      recordId,
    });
  }
  async deleteNutrition(userId: string, date?: string, recordId?: string) {
    return this.nutrition.deleteNutritionRecord(userId, {
      date,
      recordId,
    });
  }
  //==================store power======================
  async storePower(userId: string, dto: PowerRecordDto) {
    return this.power.storePower(userId, dto);
  }

  async getPowerData(userId: string, date?: string, recordId?: string) {
    return this.power.getPowerData(userId, {
      date,
      recordId,
    });
  }
  async deletePower(userId: string, date?: string, recordId?: string) {
    return this.power.deletePowerRecord(userId, {
      date,
      recordId,
    });
  }

  //==================store resting heart ragte=============
  async storeRestingHeartRate(userId: string, dto: RestingHeartRateRecordDto) {
    return this.restingHeartRate.storeRestingHeartRate(userId, dto);
  }
  async getRestingHeartRate(userId: string, date?: string, recordId?: string) {
    return this.restingHeartRate.getRestingHeartRate(userId, {
      date,
      recordId,
    });
  }
  async deleteRestingHeartRate(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.restingHeartRate.deleteRestingHeartRateRecord(userId, {
      date,
      recordId,
    });
  }
  //====================store skin temperature===============
  async storeSkinTemperature(userId: string, dto: SkinTemperatureRecordDto) {
    return this.skinTemperature.storeSkinTemperature(userId, dto);
  }
  async getSkinTemperature(userId: string, date?: string, recordId?: string) {
    return this.skinTemperature.getSkinTemperature(userId, {
      date,
      recordId,
    });
  }
  async deleteSkinTemperature(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.skinTemperature.deleteSkinTemperatureData(userId, {
      date,
      recordId,
    });
  }
  //==================store sleep session====================
  async storeSleepSession(userId: string, dto: SleepSessionRecordDto) {
    return this.sleepSession.storeSleepSession(userId, dto);
  }
  async getSleepSession(userId: string, date?: string, recordId?: string) {
    return this.sleepSession.getSleepSession(userId, { date, recordId });
  }
  async deleteSleepSession(userId: string, date?: string, recordId?: string) {
    return this.sleepSession.deleteSleepSession(userId, { date, recordId });
  }

  //=====================store speed=======================
  async storeSpeed(userId: string, dto: SpeedRecordDto) {
    return this.speed.storeSpeed(userId, dto);
  }
  async getSpeed(userId: string, date?: string, recordId?: string) {
    return this.speed.getSpeed(userId, { date, recordId });
  }
  async deleteSpeed(userId: string, date?: string, recordId?: string) {
    return this.speed.deleteSpeed(userId, { date, recordId });
  }
  //=======================store steps====================
  async storeSteps(userId: string, dto: StepsRecordDto) {
    return this.steps.storeSteps(userId, dto);
  }
  async getSteps(userId: string, date?: string, recordId?: string) {
    return this.steps.getSteps(userId, { date, recordId });
  }
  async deleteSteps(userId: string, date?: string, recordId?: string) {
    return this.steps.deleteSteps(userId, { date, recordId });
  }

  //======================store stpes cadence=======================
  async storeStepsCadence(userId: string, dto: StepsCadenceRecordDto) {
    return this.stepsCadence.storeStepsCadence(userId, dto);
  }
  async getStepsCadence(userId: string, date?: string, recordId?: string) {
    return this.stepsCadence.getStepsCadence(userId, { date, recordId });
  }
  async deleteStepsCadence(userId: string, date?: string, recordId?: string) {
    return this.stepsCadence.deleteStepsCadence(userId, { date, recordId });
  }

  //=========================store total calories burned=============
  async storeTotalCaloriesBurned(
    userId: string,
    dto: TotalCaloriesBurnedRecordDto,
  ) {
    return this.totalCaloriesBurned.storeTotalCaloriesBurned(userId, dto);
  }
  async getTotalCaloriesBurned(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.totalCaloriesBurned.getTotalCaloriesBurned(userId, {
      date,
      recordId,
    });
  }
  async deleteTotalCaloriesBurned(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.totalCaloriesBurned.deleteTotalCaloriesBurned(userId, {
      date,
      recordId,
    });
  }

  //=========================store weight============================
  async storeWeight(userId: string, dto: WeightRecordDto) {
    return this.weight.storeWeight(userId, dto);
  }
  async getWeight(userId: string, date?: string, recordId?: string) {
    return this.weight.getWeight(userId, { date, recordId });
  }
  async deleteWeight(userId: string, date?: string, recordId?: string) {
    return this.weight.deleteWeight(userId, { date, recordId });
  }
  //=========================wheel chair pushes======================
  async storeWheelchairPushes(userId: string, dto: WheelchairPushesRecordDto) {
    return this.wheelChair.storeWheelchairPushes(userId, dto);
  }
  async getWheelchairPushes(userId: string, date?: string, recordId?: string) {
    return this.wheelChair.getWheelchairPushes(userId, { date, recordId });
  }
  async deleteWheelchairPushes(
    userId: string,
    date?: string,
    recordId?: string,
  ) {
    return this.wheelChair.deleteWheelchairPushes(userId, { date, recordId });
  }
}
