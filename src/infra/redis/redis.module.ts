import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Reflector } from '@nestjs/core';

@Global()
@Module({
  providers: [RedisService, Reflector],
  exports: [RedisService],
})
export class RedisModule {}
