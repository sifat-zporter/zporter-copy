import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SendEmailModule } from '../modules/send-email/send-email.module';
import { forwardRef, Module } from '@nestjs/common';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    forwardRef(() => SendEmailModule),
  ],
})
export class AuthModule {}
