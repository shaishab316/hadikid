import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validate as configValidate } from './common/config/app.config';
import { getThrottlerConfig } from './common/config/throttler.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { LoggerMiddleware } from './common/middlewares';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { UploadModule } from './infra/upload/upload.module';
import { RedisModule } from './infra/redis/redis.module';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { SocketModule } from './infra/socket/socket.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { MAIL_QUEUE } from './infra/mail/mail.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { MailModule } from './infra/mail/mail.module';
import { ProfileModule } from './modules/profile/profile.module';
import { MediaModule } from './modules/media/media.module';
import { AddressModule } from './modules/address/address.module';
import { NotificationModule } from './infra/notification/notification.module';
import { NOTIFICATION_QUEUE } from './infra/notification/notification.constants';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ChildModule } from './modules/child/child.module';
import { ContactModule } from './modules/contact/contact.module';
import { CarpoolModule } from './modules/carpool/carpool.module';
import { CARPOOL_QUEUE } from './modules/carpool/carpool.constant';
import { PrivacyPolicyModule } from './modules/privacy-policy/privacy-policy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidate,
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: MAIL_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: NOTIFICATION_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: CARPOOL_QUEUE,
      adapter: BullMQAdapter,
    }),
    ThrottlerModule.forRoot(getThrottlerConfig()),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UploadModule,
    RedisModule,
    SocketModule,
    MailModule,
    NotificationModule,
    UserModule,
    AuthModule,
    ProfileModule,
    MediaModule,
    AddressModule,
    ConversationModule,
    ChildModule,
    ContactModule,
    CarpoolModule,
    PrivacyPolicyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    CacheInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
