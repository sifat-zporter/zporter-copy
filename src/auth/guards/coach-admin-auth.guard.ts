import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as firebase from 'firebase-admin';
import { db } from '../../config/firebase.config';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class CoachOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) { }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const header = request.headers;
      const token = header.authorization;
      const roleId = header.roleId || header.roleid || null;
      const decodedToken = await firebase.auth().verifyIdToken(token.replace('Bearer ', ''));

      if (!decodedToken) {
        throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
      }

      const { admin, user_id } = decodedToken;

      let userData: any;

      if (roleId) {
        const userDoc = await db.collection('users').doc(roleId).get();
        if (userDoc.exists) {
          userData = userDoc.data() as User;
        }
      } else if (user_id) {
        const userDoc = await db.collection('users').where('uid', '==', user_id).get();
        if (userDoc.docs.length > 0) {
          userData = userDoc.docs[0].data() as User;
        }
      }
      if (!userData && !admin) {
        throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
      }
      if (userData?.account?.isActive == false) {
        throw new HttpException('Account is inactive', HttpStatus.FORBIDDEN);
      }
      const user = {
        name: decodedToken.name || null,
        userId: userData?.userId || userData?.roleId || null,
        email: decodedToken.email || null,
        phone: decodedToken.phone_number || null,
        isAdmin: admin ? true : false,
        isCoach: (userData?.type || '').toLowerCase() === 'coach' || false,
        faceImage: userData?.media?.faceImage || ''
      };
      request.user = user;
      return true;
    } catch (error) {
      throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
    }
  }
}
