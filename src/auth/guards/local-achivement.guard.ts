import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { db } from '../../config/firebase.config';

@Injectable()
export class LocalAchievementGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();

      const header = request.headers;

      const param = request.params;
      const achievementId = param.achievementId;

      const roleId = header.roleId || header.roleid || null;

      const achievement = await db.collection('achievements').doc(achievementId).get();
      const userIdFromAchievement = achievement.data().userId;

      if (roleId != userIdFromAchievement) {
        throw new HttpException(
          `Wrong! This achievement is not your own`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return true;
    } catch (error) {
      throw new HttpException('Wrong! This achievement is not your own', HttpStatus.BAD_REQUEST);
    }
  }
}
