import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { UnicalIdService } from './unical-id.service';
import { SessionsService } from './sessions.service';
import { TotpService } from './totp.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    UnicalIdService,
    SessionsService,
    TotpService,
  ],
  exports: [AuthGuard, RolesGuard, UnicalIdService, SessionsService],
})
export class AuthModule {}
