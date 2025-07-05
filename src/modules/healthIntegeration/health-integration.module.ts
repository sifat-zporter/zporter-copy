import { Module } from '@nestjs/common';

import { HealthConnectService } from './services/HealthConnectService/healthconnect.service';
import { HealthConnectServiceCaloriesBurned } from './services/HealthConnectService/InnerHealthConnectService/HealthConnectstoreActiveCaloriesBurned.service';
import { HealthServiceDate } from './services/CommonServicesUsedByAll/date-function.service';
import { BasalMetabolicRate } from './services/HealthConnectService/InnerHealthConnectService/BasalMetabolicRate.service';
import { BloodPressure } from './services/HealthConnectService/InnerHealthConnectService/BloodPressure.service';
import { CadenceRecord } from './services/HealthConnectService/InnerHealthConnectService/CyclingPedalingCadenceRecord.service';
import { Distance } from './services/HealthConnectService/InnerHealthConnectService/Distance.service';
import { ExerciseSession } from './services/HealthConnectService/InnerHealthConnectService/ExerciseSession.service';
import { HealthConnectServiceFloorsClimbed } from './services/HealthConnectService/InnerHealthConnectService/FloorsClimbed.service';
import { HealthConnectServiceHeartRate } from './services/HealthConnectService/InnerHealthConnectService/HeartRate.service';
import { HealthConnectServiceHeight } from './services/HealthConnectService/InnerHealthConnectService/Height.service';
import { HydrationService } from './services/HealthConnectService/InnerHealthConnectService/Hydration.service';
import { HealthConnectServiceMindfulness } from './services/HealthConnectService/InnerHealthConnectService/MindfullSessioin.service';
import { NutritionService } from './services/HealthConnectService/InnerHealthConnectService/Nutritional.service';
import { HealthConnectServicePower } from './services/HealthConnectService/InnerHealthConnectService/Power.service';
import { HealthConnectServiceRestingHeartRate } from './services/HealthConnectService/InnerHealthConnectService/RestingHeartRate.service';
import { HealthConnectServiceSkinTemperature } from './services/HealthConnectService/InnerHealthConnectService/SkinTemperature.service';
import { HealthConnectServiceSleepSession } from './services/HealthConnectService/InnerHealthConnectService/SleepSession.service';
import { HealthConnectServiceSpeed } from './services/HealthConnectService/InnerHealthConnectService/Speed.service';
import { HealthConnectServiceSteps } from './services/HealthConnectService/InnerHealthConnectService/Steps.service';
import { HealthConnectServiceStepsCadence } from './services/HealthConnectService/InnerHealthConnectService/StepsCadence.service';
import { HealthConnectServiceTotalCaloriesBurned } from './services/HealthConnectService/InnerHealthConnectService/TotalCaloriesBurned.service';
import { HealthConnectServiceWeight } from './services/HealthConnectService/InnerHealthConnectService/weight.service';
import { HealthConnectServiceElevationGained } from './services/HealthConnectService/InnerHealthConnectService/ElevationGained.service';

import { HealthConnectServiceWheelchairPushes } from './services/HealthConnectService/InnerHealthConnectService/WheelChairPushes.service';
import { HealthConnectController } from './healthConnect.controller';

@Module({
  controllers: [HealthConnectController],
  providers: [
    HealthConnectService,
    HealthConnectServiceCaloriesBurned,
    HealthServiceDate,
    BasalMetabolicRate,
    BloodPressure,
    CadenceRecord,
    Distance,
    ExerciseSession,
    HealthConnectServiceFloorsClimbed,
    HealthConnectServiceHeartRate,
    HealthConnectServiceHeight,
    HydrationService,
    HealthConnectServiceMindfulness,
    NutritionService,
    HealthConnectServiceElevationGained,
    HealthConnectServicePower,
    HealthConnectServiceRestingHeartRate,
    HealthConnectServiceSkinTemperature,
    HealthConnectServiceSleepSession,
    HealthConnectServiceSpeed,
    HealthConnectServiceSteps,
    HealthConnectServiceStepsCadence,
    HealthConnectServiceTotalCaloriesBurned,
    HealthConnectServiceWeight,

    HealthConnectServiceWheelchairPushes,
  ],
})
export class HealthIntegrationModule {}
