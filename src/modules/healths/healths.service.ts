import { calculateBMI } from './../../utils/calculate-bmi';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { db } from '../../config/firebase.config';
import { getDaysArray } from '../../utils/get-days-array';
import { mappedDataByDate } from '../../utils/mapping-data-by-date';
import { mergeArray } from '../../utils/merge-array';
import { splitDateByMonth } from '../../utils/split-date-range';
import { LastMonthRange } from '../dashboard/enum/dashboard-enum';
import { CreateHealthDto } from './dto/create-health.dto';
import { GetHealthChartQuery, HealthChartType } from './dto/health.req.dto';
import { UpdateHealthDto } from './dto/update-health.dto';
import { calculateBodyFat } from '../../utils/calculate-body-fat';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { DaysArray } from '../dashboard/dto/dashboard.req.dto';
 
@Injectable()
export class HealthsService {
  private async calculateHealthChart(
    healthRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
    healthChartType: HealthChartType,
    dayArrays: DaysArray[],
    lastMonthRange: LastMonthRange,
  ) {
    const healthChartTypes = [
      {
        type: HealthChartType.HEIGHT,
        key: 'height',
      },
      {
        type: HealthChartType.WEIGHT,
        key: 'weight',
      },
      {
        type: HealthChartType.DIASTOLIC_BLOOD_PRESSURE,
        key: 'diastolicBloodPressure',
      },
      {
        type: HealthChartType.SYSTOLIC_BLOOD_PRESSURE,
        key: 'systolicBloodPressure',
      },
      {
        type: HealthChartType.REST_PULSE,
        key: 'restingPulse',
      },
      {
        type: HealthChartType.MAX_PULSE,
        key: 'maxPulse',
      },
    ];

    const aggregateField = healthChartTypes.find(
      ({ type }) => type === healthChartType,
    )?.key;

    const calculatingStats = healthRef.docs.map(async (doc) => {
      try {
        const {
          weight,
          height,
          userId,
          createdAt,
          breastSkinThickness = 0,
          waistSkinsThickness = 0,
          thighSkinThickness = 0,
        } = doc.data();

        const { age, gender } = await mappingUserInfoById(userId);

        if (aggregateField) {
          return {
            value: doc.data()[aggregateField],
            day: moment.utc(createdAt).format('YYYY-MM-DD'),
          };
        }

        if (healthChartType === HealthChartType.BMI) {
          return {
            value: calculateBMI(weight, height),
            day: moment.utc(createdAt).format('YYYY-MM-DD'),
          };
        }

        if (healthChartType === HealthChartType.BODY_FAT) {
          return {
            value: calculateBodyFat(
              breastSkinThickness,
              waistSkinsThickness,
              thighSkinThickness,
            ),
            day: moment.utc(createdAt).format('YYYY-MM-DD'),
          };
        }
      } catch (error) {
        return null;
      }
    });

    const data = await Promise.all(calculatingStats);

    const mappedHealthData = mappedDataByDate(data);

    const calculateAverage = mappedHealthData.map(({ values }) => {
      const value =
        values.reduce((acc: number, next) => acc + next.value, 0) /
        values.length;

      return { value, day: values[0]['day'] };
    });

    const mergedArray = mergeArray(dayArrays, calculateAverage);

    return {
      healthLineChart: splitDateByMonth(mergedArray, lastMonthRange),
    };
  }

  async getHealthCharts(
    currentUserId: string,
    getHealthChartQuery: GetHealthChartQuery,
  ) {
    let dayArrays: DaysArray[];
    const { healthChartType, lastMonthRange } = getHealthChartQuery;

    let personal = db
      .collection('healths')
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'desc');

    let average = db.collection('healths').orderBy('createdAt', 'desc');

    if (+lastMonthRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastMonthRange, 'month')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      personal = personal
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      average = average
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const [personalHealthRef, averageHealthRef] = await Promise.all([
      personal.get(),
      average.get(),
    ]);

    if (
      [HealthChartType.BLOOD_PRESSURE, HealthChartType.PULSE].includes(
        healthChartType,
      )
    ) {
      if (healthChartType === HealthChartType.BLOOD_PRESSURE) {
        const diastolicBloodPressureChart = this.calculateHealthChart(
          personalHealthRef,
          HealthChartType.DIASTOLIC_BLOOD_PRESSURE,
          dayArrays,
          lastMonthRange,
        );
        const systolicBloodPressure = this.calculateHealthChart(
          personalHealthRef,
          HealthChartType.SYSTOLIC_BLOOD_PRESSURE,
          dayArrays,
          lastMonthRange,
        );

        const [personalHealthChart, averageHealthChart] = await Promise.all([
          diastolicBloodPressureChart,
          systolicBloodPressure,
        ]);

        return { personalHealthChart, averageHealthChart };
      }

      if (healthChartType === HealthChartType.PULSE) {
        const maxPulseChart = this.calculateHealthChart(
          personalHealthRef,
          HealthChartType.MAX_PULSE,
          dayArrays,
          lastMonthRange,
        );
        const restingPulseChart = this.calculateHealthChart(
          personalHealthRef,
          HealthChartType.REST_PULSE,
          dayArrays,
          lastMonthRange,
        );

        const [personalHealthChart, averageHealthChart] = await Promise.all([
          maxPulseChart,
          restingPulseChart,
        ]);

        return { personalHealthChart, averageHealthChart };
      }
    }

    const [personalHealthChart, averageHealthChart] = await Promise.all([
      this.calculateHealthChart(
        personalHealthRef,
        healthChartType,
        dayArrays,
        lastMonthRange,
      ),
      this.calculateHealthChart(
        averageHealthRef,
        healthChartType,
        dayArrays,
        lastMonthRange,
      ),
    ]);

    return {
      personalHealthChart,
      averageHealthChart,
    };
  }

  async getListHealths(currentUserId: string, paginationDto: PaginationDto) {
    const { limit, startAfter, sorted } = paginationDto;
    let healthRef = db
      .collection('healths')
      .orderBy('createdAt', sorted)
      .where('userId', '==', currentUserId);

    if (!startAfter) {
      healthRef = healthRef.limit(+limit);
    }

    if (startAfter) {
      healthRef = healthRef.startAfter(+startAfter).limit(+limit);
    }

    const [{ age, gender }, healthSnapshot] = await Promise.all([
      mappingUserInfoById(currentUserId),
      healthRef.get(),
    ]);

    const healthDocs = healthSnapshot.docs;

    const result = healthDocs.map((doc) => {
      const height = doc.data()?.height;
      const weight = doc.data()?.weight;
      const thighSkinThickness = doc.data()?.thighSkinThickness || 0;
      const waistSkinsThickness = doc.data()?.waistSkinsThickness || 0;
      const breastSkinThickness = doc.data()?.breastSkinThickness || 0;

      const bmi = calculateBMI(weight, height);
      const fat = calculateBodyFat(
        breastSkinThickness,
        waistSkinsThickness,
        thighSkinThickness,
      );

      return { healthId: doc.id, ...doc.data(), bmi, fat };
    });

    return result;
  }

  async createUserHealthData(userId: string, createHealthDto: CreateHealthDto) {
    const now = Date.now();

    const newHealthDoc = await db.collection('healths').add({
      ...createHealthDto,
      userId: userId,
      createdAt: now,
      updatedAt: now,
    });
    return {
      message: 'Created user health',
      healthDocId: newHealthDoc.id,
    };
  }

  findAll() {
    return `This action returns all healths`;
  }

  findOne(id: number) {
    return `This action returns a #${id} health`;
  }

  async updateUserHealthData(
    userId: string,
    docId: string,
    updateHealthDto: UpdateHealthDto,
  ) {
    if (!docId) {
      throw new HttpException(
        `Document Id is required`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const checkOwner = await db
      .collection('healths')
      .where(firebase.firestore.FieldPath.documentId(), '==', docId)
      .where('userId', '==', userId)
      .get();

    if (checkOwner.empty) {
      throw new HttpException(`Resource not found`, HttpStatus.NOT_FOUND);
    }

    await db
      .collection('healths')
      .doc(docId)
      .update({
        ...updateHealthDto,
        updatedAt: +moment.utc().format('x'),
      });
    return {
      message: 'Updated health',
      healthDocId: docId,
    };
  }

  async removeUserHealthData(userId: string, docId: string) {
    const checkOwner = await db
      .collection('healths')
      .where(firebase.firestore.FieldPath.documentId(), '==', docId)
      .where('userId', '==', userId)
      .get();

    if (checkOwner.empty) {
      throw new HttpException(`Resource not found`, HttpStatus.NOT_FOUND);
    }

    await db.collection('healths').doc(docId).delete();

    return {
      message: 'Deleted health',
      personalGoalId: docId,
    };
  }
}
