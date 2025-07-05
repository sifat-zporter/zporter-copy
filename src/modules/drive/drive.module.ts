import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';

@Module({
  // Declares which controllers are part of this module
  controllers: [DriveController],

  // Declares which providers (services, guards, etc.) are part of this module
  providers: [DriveService],

  // Makes the DriveService available to other modules that import DriveModule
  exports: [DriveService],
})
export class DriveModule {} // Root module for Drive feature (files, metadata, sharing, etc.)
