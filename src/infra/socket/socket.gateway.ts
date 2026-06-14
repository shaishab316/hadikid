import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '@/modules/user/repositories/user.repository';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected — socketId: ${client.id}`);
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        (client.handshake.headers?.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.split(' ')[1]
          : client.handshake.headers?.authorization);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided for client ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = +payload.sub;

      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn(`Connection rejected: User not found for client ${client.id}`);
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      client.data.userId = userId;

      await client.join(`user:${userId}`);
      this.logger.log(`User ${userId} successfully authenticated and joined room user:${userId}`);
    } catch (err: any) {
      this.logger.error(`Connection authentication failed: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected — socketId: ${client.id}`);
  }

  emit(rooms: string | string[], event: string, data: any) {
    if (rooms === '*') {
      this.server.emit(event, data);
      this.logger.debug(
        `Emitted event '${event}' to all clients with data: ${JSON.stringify(data)}`,
      );
    } else if (typeof rooms === 'string') {
      this.server.to(rooms).emit(event, data);
      this.logger.debug(
        `Emitted event '${event}' to room '${rooms}' with data: ${JSON.stringify(data)}`,
      );
    } else {
      rooms.forEach((room, idx) => {
        this.server.to(room).emit(event, data);
        this.logger.debug(
          `Emitted event '${event}' to room '${room}' with data: ${JSON.stringify(data)} (index ${idx})`,
        );
      });
    }
  }
}
