import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddressRepository } from './repositories/address.repository';
import { QueryAddressDto } from './dto/query-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async createAddress(userId: number, dto: CreateAddressDto) {
    return await this.addressRepository.createAddress(userId, dto);
  }

  async queryAddress(userId: number, query: QueryAddressDto) {
    return await this.addressRepository.queryAddress(userId, query);
  }

  async deleteAddress(userId: number, addressId: string) {
    return await this.addressRepository.deleteAddress(userId, addressId);
  }
}
