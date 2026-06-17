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
      photo: {
        connect: {
          id: photoId,
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
      if (schoolName) {
        const schoolId = await this.findOrCreateSchoolByName(schoolName);
        data.school = { connect: { id: schoolId } };
      } else {
        data.school = { disconnect: true };
      }
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

  private async findOrCreateSchoolByName(name: string): Promise<string> {
    const existingSchool = await this.prisma.school.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingSchool) return existingSchool.id;

    const newSchool = await this.prisma.school.create({
      data: { name },
      select: { id: true },
    });

    return newSchool.id;
  }

  async hasChildren(parentId: number) {
    const child = await this.prisma.child.findFirst({
      where: { parentId },
      select: { id: true },
    });

    return !!child;
  }
}
