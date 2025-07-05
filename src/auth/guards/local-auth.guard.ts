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
export class LocalAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isAuthorized = this.reflector.get<boolean>(
        'isAuthorized',
        context.getHandler(),
      );

      const request = context.switchToHttp().getRequest();

      const header = request.headers;

      const token = header.authorization;

      const roleId = header.roleId || header.roleid || null;

      const decodedToken = await firebase
        .auth()
        .verifyIdToken(token.replace('Bearer ', ''));

      const isAdmin = decodedToken?.admin || false;
      const user = {
        userId: decodedToken.user_id,
        email: decodedToken.email || null,
        phone: decodedToken.phone_number || null,
        roleId,
        isAdmin,
      };

      request.user = user;

      return true;
    } catch (error) {
      throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
    }
  }
}
