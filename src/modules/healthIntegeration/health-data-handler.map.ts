import { ActiveCaloriesBurnedRecordDto } from './dto/GoogleConnect/ActiveCaloriesBurnedRecord.dto';
import { BasalMetabolicRateRecordDto } from './dto/GoogleConnect/BasicMetabolicRateRecord.dto';
import { BloodPressureRecordDto } from './dto/GoogleConnect/blood-pressure.dto';
import { CyclingPedalingCadenceRecordDto } from './dto/GoogleConnect/CyclingPedalingCadenceRecord.dto';
import { DistanceRecordDto } from './dto/GoogleConnect/DistanceRecord.dto';
import { ElevationGainedRecordDto } from './dto/GoogleConnect/ElevationGainedRecord.dto';
import { ExerciseSessionRecordDto } from './dto/GoogleConnect/ExcerciseSessionRecord.dto';
import { FloorsClimbedRecordDto } from './dto/GoogleConnect/FloorClimbedRecord.dto';
import { HeartRateRecordDto } from './dto/GoogleConnect/HeartRate.dto';
import { HeightRecordDto } from './dto/GoogleConnect/HeightRecord.dto';
import { HydrationRecordDto } from './dto/GoogleConnect/HydrationRcord.dto';
import { MindfulnessSessionRecordDto } from './dto/GoogleConnect/MindFullSsessionRecord.dto';
import { NutritionRecordDto } from './dto/GoogleConnect/NutritionRecord.dto';
import { PowerRecordDto } from './dto/GoogleConnect/PowerRecord.dto';
import { RestingHeartRateRecordDto } from './dto/GoogleConnect/RestingHeartRateRecord.dto';
import { SkinTemperatureRecordDto } from './dto/GoogleConnect/SkinTemperatureRecord.dto';
import { SleepSessionRecordDto } from './dto/GoogleConnect/SleepSessionRecord.dto';
import { SpeedRecordDto } from './dto/GoogleConnect/SpeedRecord.dto';
import { StepsCadenceRecordDto } from './dto/GoogleConnect/StepsCadenceRecord.dto';
import { StepsRecordDto } from './dto/GoogleConnect/StepsRecord.dto';
import { TotalCaloriesBurnedRecordDto } from './dto/GoogleConnect/TotalCaloriesBurnedRecord.dto';
import { WeightRecordDto } from './dto/GoogleConnect/WeightRecord.dto';
import { WheelchairPushesRecordDto } from './dto/GoogleConnect/WheelChairPushesRecord.dto';
import { HealthDataType } from './enum/HealthConnect.enum';

export const healthDataHandlerMap = {
  [HealthDataType.ACTIVE_CALORIES]: {
    dto: ActiveCaloriesBurnedRecordDto,
    serviceMethod: 'storeActiveCaloriesBurned',
  },
  [HealthDataType.BASAL_METABOLIC_RATE]: {
    dto: BasalMetabolicRateRecordDto,
    serviceMethod: 'storeBasalMetabolicRate',
  },
  [HealthDataType.BLOOD_PRESSURE]: {
    dto: BloodPressureRecordDto,
    serviceMethod: 'storeBloodPressure',
  },
  [HealthDataType.CYCLING_CADENCE]: {
    dto: CyclingPedalingCadenceRecordDto,
    serviceMethod: 'storeCyclingCadence',
  },
  [HealthDataType.DISTANCE]: {
    dto: DistanceRecordDto,
    serviceMethod: 'storeDistanceRecord',
  },
  [HealthDataType.ELEVATION_GAINED]: {
    dto: ElevationGainedRecordDto,
    serviceMethod: 'storeElevationGained',
  },
  [HealthDataType.EXERCISE_SESSION]: {
    dto: ExerciseSessionRecordDto,
    serviceMethod: 'storeExerciseSession',
  },
  [HealthDataType.FLOORS_CLIMBED]: {
    dto: FloorsClimbedRecordDto,
    serviceMethod: 'storeFloorsClimbed',
  },
  [HealthDataType.HEART_RATE]: {
    dto: HeartRateRecordDto,
    serviceMethod: 'storeHeartRate',
  },
  [HealthDataType.HEIGHT]: {
    dto: HeightRecordDto,
    serviceMethod: 'storeHeight',
  },
  [HealthDataType.HYDRATION]: {
    dto: HydrationRecordDto,
    serviceMethod: 'storeHydration',
  },
  [HealthDataType.MINDFULNESS_SESSION]: {
    dto: MindfulnessSessionRecordDto,
    serviceMethod: 'storeMindfulnessSession',
  },
  [HealthDataType.NUTRITION]: {
    dto: NutritionRecordDto,
    serviceMethod: 'storeNutrition',
  },
  [HealthDataType.POWER]: {
    dto: PowerRecordDto,
    serviceMethod: 'storePower',
  },
  [HealthDataType.RESTING_HEART_RATE]: {
    dto: RestingHeartRateRecordDto,
    serviceMethod: 'storeRestingHeartRate',
  },
  [HealthDataType.SKIN_TEMPERATURE]: {
    dto: SkinTemperatureRecordDto,
    serviceMethod: 'storeSkinTemperature',
  },
  [HealthDataType.SLEEP_SESSION]: {
    dto: SleepSessionRecordDto,
    serviceMethod: 'storeSleepSession',
  },
  [HealthDataType.SPEED]: {
    dto: SpeedRecordDto,
    serviceMethod: 'storeSpeed',
  },
  [HealthDataType.STEPS]: {
    dto: StepsRecordDto,
    serviceMethod: 'storeSteps',
  },
  [HealthDataType.STEPS_CADENCE]: {
    dto: StepsCadenceRecordDto,
    serviceMethod: 'storeStepsCadence',
  },
  [HealthDataType.TOTAL_CALORIES_BURNED]: {
    dto: TotalCaloriesBurnedRecordDto,
    serviceMethod: 'storeTotalCaloriesBurned',
  },
  [HealthDataType.WEIGHT]: {
    dto: WeightRecordDto,
    serviceMethod: 'storeWeight',
  },
  [HealthDataType.WHEELCHAIR_PUSHES]: {
    dto: WheelchairPushesRecordDto,
    serviceMethod: 'storeWheelchairPushes',
  },
};

export const healthDataGetHandlerMap = {
  [HealthDataType.ACTIVE_CALORIES]: 'getActiveCaloriesBurned',
  [HealthDataType.BASAL_METABOLIC_RATE]: 'getBasalMetabolicRate',
  [HealthDataType.BLOOD_PRESSURE]: 'getBloodPressure', // add this if your service has this method
  [HealthDataType.CYCLING_CADENCE]: 'getCyclingCadence',
  [HealthDataType.DISTANCE]: 'getDistanceRecord',
  [HealthDataType.ELEVATION_GAINED]: 'getElevationGainedRecord',
  [HealthDataType.EXERCISE_SESSION]: 'getExerciseSessions',
  [HealthDataType.FLOORS_CLIMBED]: 'getFloorsClimbedRecord',
  [HealthDataType.HEART_RATE]: 'getHeartRateRecord',
  [HealthDataType.HEIGHT]: 'getHeight',
  [HealthDataType.HYDRATION]: 'getHydration',
  [HealthDataType.MINDFULNESS_SESSION]: 'getMindfulnessSession',
  [HealthDataType.NUTRITION]: 'getNutritionData',
  [HealthDataType.POWER]: 'getPowerData',
  [HealthDataType.RESTING_HEART_RATE]: 'getRestingHeartRate',
  [HealthDataType.SKIN_TEMPERATURE]: 'getSkinTemperature',
  [HealthDataType.SLEEP_SESSION]: 'getSleepSession',
  [HealthDataType.SPEED]: 'getSpeed',
  [HealthDataType.STEPS]: 'getSteps',
  [HealthDataType.STEPS_CADENCE]: 'getStepsCadence',
  [HealthDataType.TOTAL_CALORIES_BURNED]: 'getTotalCaloriesBurned',
  [HealthDataType.WEIGHT]: 'getWeight',
  [HealthDataType.WHEELCHAIR_PUSHES]: 'getWheelchairPushes',
};
export const healthDataDeleteHandlerMap = {
  [HealthDataType.ACTIVE_CALORIES]: 'deleteActiveCaloriesBurned',
  [HealthDataType.BASAL_METABOLIC_RATE]: 'deleteBasalMetabolicRate',
  [HealthDataType.BLOOD_PRESSURE]: 'deleteBloodPressure',
  [HealthDataType.CYCLING_CADENCE]: 'deleteCyclingCadence',
  [HealthDataType.DISTANCE]: 'deleteDistanceRecord',
  [HealthDataType.ELEVATION_GAINED]: 'deleteElevationGained',
  [HealthDataType.EXERCISE_SESSION]: 'deleteExerciseSession',
  [HealthDataType.FLOORS_CLIMBED]: 'deleteFloorsClimbed',
  [HealthDataType.HEART_RATE]: 'deleteHeartRate',
  [HealthDataType.HEIGHT]: 'deleteHeight',
  [HealthDataType.HYDRATION]: 'deleteHydration',
  [HealthDataType.MINDFULNESS_SESSION]: 'deleteMindfulnessSession',
  [HealthDataType.NUTRITION]: 'deleteNutrition',
  [HealthDataType.POWER]: 'deletePower',
  [HealthDataType.RESTING_HEART_RATE]: 'deleteRestingHeartRate',
  [HealthDataType.SKIN_TEMPERATURE]: 'deleteSkinTemperature',
  [HealthDataType.SLEEP_SESSION]: 'deleteSleepSession',
  [HealthDataType.SPEED]: 'deleteSpeed',
  [HealthDataType.STEPS]: 'deleteSteps',
  [HealthDataType.STEPS_CADENCE]: 'deleteStepsCadence',
  [HealthDataType.TOTAL_CALORIES_BURNED]: 'deleteTotalCaloriesBurned',
  [HealthDataType.WEIGHT]: 'deleteWeight',
  [HealthDataType.WHEELCHAIR_PUSHES]: 'deleteWheelchairPushes',
};
