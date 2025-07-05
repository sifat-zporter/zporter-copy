import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../../config/firebase.config';
import { CreateDriveDto } from './dto/drive.dto';

interface StoredDriveFileDocument extends CreateDriveDto {
  userId: string;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class DriveService {
  /**
   * Returns a reference to the user's files subcollection in Firestore.
   * Structure: drive/{userId}/files/
   */
  private getUserFilesCollection(userId: string) {
    return db.collection('drive').doc(userId).collection('files');
  }

  /**
   * Creates a new file entry in the user's Drive collection.
   * Adds timestamps and userId to the metadata.
   */
  async createDriveFile(userId: string, dto: CreateDriveDto) {
    const now = Date.now();
    const fileData = {
      ...dto,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const fileRef = await this.getUserFilesCollection(userId).add(fileData);
    const docSnapshot = await fileRef.get();

    if (!docSnapshot.exists) {
      throw new Error('Failed to retrieve the created document.');
    }

    return {
      id: docSnapshot.id,
      ...(docSnapshot.data() as StoredDriveFileDocument),
    };
  }

  /**
   * Retrieves all drive files associated with a given user.
   * Returns an array of file metadata including the fileId (doc.id).
   */
  async getDriveUserFiles(userId: string) {
    const snapshot = await this.getUserFilesCollection(userId).get();

    const files = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      message: 'Drive files fetched successfully',
      files,
    };
  }

  /**
   * Deletes a specific file from the user's Drive collection.
   * Checks that the file exists and belongs to the requesting user.
   */
  async deleteDriveFile(userId: string, fileId: string) {
    const docRef = this.getUserFilesCollection(userId).doc(fileId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('File not found.');
    }

    if (doc.data().userId !== userId) {
      throw new ForbiddenException('Unauthorized to delete this file.');
    }

    await docRef.delete();
    return { message: `File ${fileId} deleted successfully.` };
  }

  /**
   * Updates metadata for a specific file in the user's Drive collection.
   * Ensures the file exists and is owned by the user before applying updates.
   */
  async updateDriveFile(
    userId: string,
    fileId: string,
    updateData: Partial<CreateDriveDto>,
  ) {
    const docRef = this.getUserFilesCollection(userId).doc(fileId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('File not found.');
    }

    if (doc.data().userId !== userId) {
      throw new ForbiddenException('Unauthorized to update this file.');
    }

    await docRef.update({
      ...updateData,
      updatedAt: Date.now(),
    });

    return { message: `File ${fileId} updated successfully.` };
  }
}
