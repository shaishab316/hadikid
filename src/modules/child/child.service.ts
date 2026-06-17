import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChildRepository } from './repositories/child.repository';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { QueryChildDto } from './dto/query-child.dto';

@Injectable()
export class ChildService {
  constructor(private readonly childRepo: ChildRepository) {}

  async createChild(parentId: number, dto: CreateChildDto) {
    return this.childRepo.create(parentId, dto);
  }

  async getChildren(parentId: number, query: QueryChildDto) {
    return this.childRepo.findAllByParent(parentId, query);
  }

  async getChildById(parentId: number, childId: string) {
    const child = await this.childRepo.findById(childId);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (child.parentId !== parentId) {
      throw new ForbiddenException(
        'You are not authorized to view this child',
      );
    }

    return child;
  }

  async updateChildById(parentId: number, childId: string, dto: UpdateChildDto) {
    const child = await this.childRepo.findById(childId);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (child.parentId !== parentId) {
      throw new ForbiddenException(
        'You are not authorized to update this child',
      );
    }

    return this.childRepo.update(childId, dto);
  }

  async removeChildById(parentId: number, childId: string) {
    const child = await this.childRepo.findById(childId);
    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (child.parentId !== parentId) {
      throw new ForbiddenException(
        'You are not authorized to remove this child',
      );
    }

    await this.childRepo.delete(childId);
  }
}
