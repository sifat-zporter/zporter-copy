import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateMedicalDto } from './dto/create-medical.dto';
import { db } from '../../config/firebase.config';
import { PaginationDto } from '../../common/pagination/pagination.dto';

@Injectable()
export class MedicalsService {
  async createUserMedicalData(
    userId: string,
    createMedicalDto: CreateMedicalDto,
  ) {
    const now = Date.now();

    try {
      console.log(createMedicalDto, 'createMedicalDto');
      const plainMedicalData = JSON.parse(JSON.stringify(createMedicalDto));

      const newMedicalDoc = await db.collection('medical').add({
        ...plainMedicalData,
        userId,
        createdAt: now,
        updatedAt: now,
      });

      return {
        message: 'Created user medical record',
        medicalDocId: newMedicalDoc.id,
      };
    } catch (error) {
      console.error('Error creating medical data:', error);
      throw new HttpException(
        'Failed to create medical data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteMedicalRecord(userId: string, docId: string) {
    if (!docId) {
      throw new HttpException(
        'Document ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const docRef = db.collection('medical').doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new HttpException(
          'Medical record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const data = doc.data();
      if (data?.userId !== userId) {
        throw new HttpException(
          'Unauthorized to delete this record',
          HttpStatus.FORBIDDEN,
        );
      }

      await docRef.delete();

      return {
        message: 'Medical record deleted successfully',
        medicalDocId: docId,
      };
    } catch (error) {
      console.error('Error deleting medical record:', error);
      throw new HttpException(
        'Failed to delete medical record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getOneMedicalRecord(userId: string, docId: string) {
    const doc = await db.collection('medical').doc(docId).get();

    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new HttpException(`Medical record not found`, HttpStatus.NOT_FOUND);
    }

    const data = doc.data();

    // Destructure and exclude unwanted fields
    const { userId: _, createdAt, updatedAt, ...filteredData } = data;

    return {
      id: doc.id,
      ...filteredData,
    };
  }
  async getListMedicalData(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit, startAfter, sorted, userIdQuery } = paginationDto;
    const userIdForQuery = userIdQuery || currentUserId;
    let medicalRef = db
      .collection('medical')
      .orderBy('createdAt', sorted || 'asc')
      .where('userId', '==', userIdForQuery)
      .select(
        'date',
        'genralHealthValue',
        'ecgTest',
        'medicationAndSupplements',
        'anyEcGRecently',
        'createdAt',
      );

    if (startAfter) {
      medicalRef = medicalRef.startAfter(+startAfter).limit(+limit);
    } else {
      medicalRef = medicalRef.limit(+limit);
    }

    const snapshot = await medicalRef.get();
    const medicalDocs = snapshot.docs;

    const results = medicalDocs.map((doc) => {
      const data = doc.data();

      // Default value for WADA field
      let wada = 'No';

      // Check medicationAndSupplements[2] (3rd index)
      if (
        Array.isArray(data.medicationAndSupplements) &&
        data.medicationAndSupplements.length > 2
      ) {
        const wadaAnswer =
          data.medicationAndSupplements[3]?.switchButtonQuestion?.answer;

        wada = wadaAnswer === true ? 'Yes' : 'No';
      }
      let ecgTestStatus = 'No';
      if (typeof data.anyEcGRecently === 'boolean') {
        ecgTestStatus = data.anyEcGRecently ? 'Yes' : 'No';
      }

      return {
        medicalId: doc.id,
        date: data.date,
        genralHealthValue: data.genralHealthValue,
        ecgTest: ecgTestStatus,
        wada: wada,
        createdAt: data.createdAt,
      };
    });

    return results;
  }
  async updateMedicalRecord(
    userId: string,
    docId: string,
    updateMedicalDto: Partial<CreateMedicalDto>,
  ) {
    if (!docId) {
      throw new HttpException(
        'Document ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const docRef = db.collection('medical').doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new HttpException(
          'Medical record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const existingData = doc.data();
      if (existingData?.userId !== userId) {
        throw new HttpException(
          'Unauthorized to update this record',
          HttpStatus.FORBIDDEN,
        );
      }

      const plainUpdateData = JSON.parse(JSON.stringify(updateMedicalDto));

      await docRef.update({
        ...plainUpdateData,
        updatedAt: Date.now(),
      });

      return {
        message: 'Medical record updated successfully',
        medicalDocId: docId,
      };
    } catch (error) {
      console.error('Error updating medical record:', error);
      throw new HttpException(
        'Failed to update medical record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getMedicalRecordPublic(docId: string) {
    const doc = await db.collection('medical').doc(docId).get();

    if (!doc.exists) {
      throw new HttpException(`Medical record not found`, HttpStatus.NOT_FOUND);
    }

    const data = doc.data();

    // Destructure and exclude unwanted fields
    const { userId, createdAt, updatedAt, ...filteredData } = data;

    if (!userId) {
      throw new HttpException(
        `User ID not found in medical record`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpException(`User not found`, HttpStatus.NOT_FOUND);
    }

    const userData = userDoc.data();
    const faceImage = userData?.media?.faceImage || null;
    const alpha2Code = userData?.profile?.birthCountry?.alpha2Code || null;
    const city = userData?.profile?.city || null;
    const fullName = userData?.profile?.fullName || [];
    const userName = userData?.username || null;
    const favoriteRoles = userData?.playerCareer?.favoriteRoles || [];
    const clubId = userData?.playerCareer?.clubId;
    let clubName = null;
    if (clubId) {
      const clubDoc = await db.collection('clubs').doc(clubId).get();
      if (clubDoc.exists) {
        const clubData = clubDoc.data();
        clubName = clubData?.clubName || null;
      }
    }
    return {
      id: doc.id,
      ...filteredData,
      user: {
        faceImage,
        alpha2Code,
        city,
        fullName,
        userName,
        favoriteRoles,
        clubName,
      },
    };
  }
  async getReccomendationMedical(userId: string) {
    const snapshot = await db
      .collection('medical')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {};
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log(data, 'Here');
    const filteredData = {
      allergiesAndIntolerances: data?.allergiesAndIntolerances || [],
      bloodTypAndVaccination: data?.bloodTypAndVaccination || {},
      majorInjury: data?.majorInjury || {},
      illnessAndFamilyHistory: data?.illnessAndFamilyHistory || {},
      ecgTest: data?.ecgTest,
    };

    return filteredData;
  }
}
