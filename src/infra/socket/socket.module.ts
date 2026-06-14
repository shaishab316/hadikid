import { Global, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';

@Global()
@Module({
  imports: [AuthModule, UserModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
