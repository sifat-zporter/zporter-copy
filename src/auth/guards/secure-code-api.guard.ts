import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SecureCodeApiGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();

      const base64Code = request.headers.secureCode || request.headers.securecode;
      const secureCode = Buffer.from(base64Code.trim(), 'base64').toString();
			
      if (secureCode !== process.env.SECURE_CODE) {
				return false;
      }

      return true;
    } catch (error) {
      throw new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
    }
  }
}
