import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { AddressRepository } from './repositories/address.repository';

@Module({
  controllers: [AddressController],
  providers: [AddressService, AddressRepository],
})
export class AddressModule {}
