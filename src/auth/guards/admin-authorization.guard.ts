import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as firebase from 'firebase-admin';

@Injectable()
export class AdminAuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();

      const header = request.headers;

      const token = header.authorization;

      const roleId = header.roleId || header.roleid || null;

      const decodedToken = await firebase
        .auth()
        .verifyIdToken(token.replace('Bearer ', ''));

      const isAdmin = decodedToken?.admin == true ? true : false;
      const user = {
        userId: decodedToken.user_id,
        email: decodedToken.email || null,
        phone: decodedToken.phone_number || null,
        roleId,
        isAdmin,
      };

      request.user = user;

      return isAdmin;
    } catch (error) {
      throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
    }
  }
}
