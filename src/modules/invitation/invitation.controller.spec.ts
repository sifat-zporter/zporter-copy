import { Test, TestingModule } from '@nestjs/testing';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { storage } from 'firebase-admin';

jest.mock('firebase-admin', () => {
  return {
    firestore: jest.fn(),
    messaging: jest.fn(),
    database: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    initializeApp: jest.fn(),
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        file: jest.fn(),
        upload: jest.fn(),
        delete: jest.fn(),
      })),
    })),
  };
});
describe('InvitationController', () => {
  let controller: InvitationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [InvitationService],
    }).compile();

    controller = module.get<InvitationController>(InvitationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
