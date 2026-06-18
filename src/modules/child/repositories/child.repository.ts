import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChildInclude } from '../child.constant';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto/update-child.dto';
import { QueryChildDto } from '../dto/query-child.dto';

@Injectable()
export class ChildRepository {
  private readonly logger = new Logger(ChildRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(parentId: number, dto: CreateChildDto) {
    this.logger.debug(`Creating child for parent ${parentId}`);

    const { photoId, schoolName, name, grade, relationship } = dto;

    const data: Prisma.ChildCreateInput = {
      name,
      parent: {
        connect: {
          id: parentId,
        },
      },
      grade,
      relationship,
    };

    if (schoolName) {
      data.school = {
        connectOrCreate: {
          where: {
            name: schoolName,
          },
          create: {
            name: schoolName,
          },
        },
      };
    }

    if (photoId) {
      data.photo = {
        connect: {
          id: photoId,
        },
      };
    }

    return await this.prisma.child.create({
      data,
      include: ChildInclude,
    });
  }

  async findById(id: string) {
    return await this.prisma.child.findUnique({
      where: { id },
      include: ChildInclude,
    });
  }

  async findAllByParent(parentId: number, query: QueryChildDto) {
    const { limit, page, search } = query;

    const where: Prisma.ChildWhereInput = {
      parentId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return await Promise.all([
      this.prisma.child.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: ChildInclude,
      }),
      this.prisma.child.count({ where }),
    ]);
  }

  async update(id: string, dto: UpdateChildDto) {
    this.logger.debug(`Updating child ${id}`);

    const { photoId, schoolName, ...rest } = dto;

    const data: Prisma.ChildUpdateInput = {
      ...rest,
    };

    if (photoId !== undefined) {
      data.photo = photoId
        ? { connect: { id: photoId } }
        : { disconnect: true };
    }

    if (schoolName !== undefined) {
      data.school = schoolName
        ? {
            connectOrCreate: {
              where: { name: schoolName },
              create: { name: schoolName },
            },
          }
        : { disconnect: true };
    }

    return await this.prisma.child.update({
      where: { id },
      data,
      include: ChildInclude,
    });
  }

  async delete(id: string) {
    this.logger.debug(`Deleting child ${id}`);

    return await this.prisma.child.delete({
      where: { id },
    });
  }

  async hasChildren(parentId: number) {
    const child = await this.prisma.child.findFirst({
      where: { parentId },
      select: { id: true },
    });

    return !!child;
  }
}
