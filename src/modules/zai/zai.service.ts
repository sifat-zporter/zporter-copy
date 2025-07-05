import { Body, ForbiddenException, Injectable, NotFoundException, Post } from "@nestjs/common";
import { db } from "../../config/firebase.config";
import { CreateZaiDto } from "./dto/create-user-setting.dto";

@Injectable()
export class ZaiService{
    async createZaiUserData(userId: string, zaiData: CreateZaiDto) {
        const collectionRef = db
            .collection('zai')
            .doc('zai-user-setting')
            .collection('zai-user-data');

        const existingSnapshot = await collectionRef
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            throw new ForbiddenException('User already has a Zai document.');
        }

        const now = Date.now();
        const newDoc = await collectionRef.add({
            ...zaiData,
            userId,
            createdAt: now,
            updatedAt: now,
        });

        return {
            message: 'Created user Zai data',
            zaiDocId: newDoc.id,
        };
    }
    async getZaiUserData(userId: string) {
        const collectionRef = db
            .collection('zai')
            .doc('zai-user-setting')
            .collection('zai-user-data');

        const snapshot = await collectionRef
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return {
                message: 'No Zai data found for this user.',
                data: null,
            };
        }

        const doc = snapshot.docs[0];
        return {
            message: 'Zai data retrieved successfully',
            data: {
                id: doc.id,
                ...doc.data(),
            },
        };
    }

    async deleteZaiUserData(userId: string) {
        const collectionRef = db
            .collection('zai')
            .doc('zai-user-setting')
            .collection('zai-user-data');

        const snapshot = await collectionRef
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return {
                message: 'No Zai data found for this user.',
            };
        }

        const docRef = snapshot.docs[0].ref;
        await docRef.delete();

        return {
            message: `Deleted Zai record for user ${userId}.`,
        };
    }
    async updateZaiUserData(
        userId: string,
        updateData: Partial<CreateZaiDto>,
    ) {
        const collectionRef = db
            .collection('zai')
            .doc('zai-user-setting')
            .collection('zai-user-data');

        const snapshot = await collectionRef
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new NotFoundException('Zai record not found for this user.');
        }

        const doc = snapshot.docs[0];
        const docRef = doc.ref;

        if (doc.data().userId !== userId) {
            throw new ForbiddenException('You are not authorized to update this record.');
        }

        const now = Date.now();

        await docRef.update({
            ...updateData,
            updatedAt: now,
        });

        return {
            message: `Zai record ${doc.id} updated successfully.`,
        };
    }


}