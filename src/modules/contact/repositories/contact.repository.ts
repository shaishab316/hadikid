import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContactInclude, ContactRequestInclude } from '../contact.constant';
import {
  QueryContactRequestsDto,
  QueryContactsDto,
} from '../dto/query-contact.dto';
import { userSearchableFields } from '@/modules/user/user.constant';

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRequestById(id: string) {
    return await this.prisma.contactRequest.findUnique({
      where: { id },
      include: ContactRequestInclude,
    });
  }

  async findRequestBetweenUsers(senderId: number, receiverId: number) {
    return await this.prisma.contactRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      include: ContactRequestInclude,
    });
  }

  async createRequest(senderId: number, receiverId: number, message?: string) {
    return await this.prisma.contactRequest.create({
      data: {
        senderId,
        receiverId,
        message,
        status: 'PENDING',
      },
      include: ContactRequestInclude,
    });
  }

  async updateRequestStatus(
    id: string,
    status: 'ACCEPTED' | 'DECLINED' | 'PENDING' | 'CANCELLED',
    respondedAt?: Date,
  ) {
    return await this.prisma.contactRequest.update({
      where: { id },
      data: {
        status,
        respondedAt,
      },
      include: ContactRequestInclude,
    });
  }

  async deleteRequest(id: string) {
    return await this.prisma.contactRequest.delete({
      where: { id },
    });
  }

  async findIncomingRequests(userId: number, query: QueryContactRequestsDto) {
    const { limit, page, search, status } = query;

    const where: Prisma.ContactRequestWhereInput = {
      receiverId: userId,
      status,
    };

    if (search) {
      where.sender = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    return await Promise.all([
      this.prisma.contactRequest.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: ContactRequestInclude,
      }),
      this.prisma.contactRequest.count({ where }),
    ]);
  }

  async findOutgoingRequests(userId: number, query: QueryContactRequestsDto) {
    const { limit, page, search, status } = query;

    const where: Prisma.ContactRequestWhereInput = {
      senderId: userId,
      status,
    };

    if (search) {
      where.receiver = {
        OR: userSearchableFields.map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        })),
      };
    }

    return await Promise.all([
      this.prisma.contactRequest.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: ContactRequestInclude,
      }),
      this.prisma.contactRequest.count({ where }),
    ]);
  }

  async findContactById(id: string) {
    return await this.prisma.contact.findUnique({
      where: { id },
      include: ContactInclude,
    });
  }

  async findContactBetweenUsers(userId1: number, userId2: number) {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return await this.prisma.contact.findUnique({
      where: {
        userId1_userId2: {
          userId1: minId,
          userId2: maxId,
        },
      },
      include: ContactInclude,
    });
  }

  async createContact(userId1: number, userId2: number) {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return await this.prisma.contact.create({
      data: {
        userId1: minId,
        userId2: maxId,
      },
      include: ContactInclude,
    });
  }

  async updateContactAlias(
    id: string,
    currentUserId: number,
    alias: string | null,
  ) {
    const contact = await this.findContactById(id);
    if (!contact) return null;

    const data: Prisma.ContactUpdateInput = {};
    if (contact.userId1 === currentUserId) {
      data.alias1 = alias;
    } else {
      data.alias2 = alias;
    }

    return await this.prisma.contact.update({
      where: { id },
      data,
      include: ContactInclude,
    });
  }

  async blockContact(id: string, blockedBy: number) {
    return await this.prisma.contact.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedBy,
        blockedAt: new Date(),
      },
      include: ContactInclude,
    });
  }

  async unblockContact(id: string) {
    return await this.prisma.contact.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedBy: null,
        blockedAt: null,
      },
      include: ContactInclude,
    });
  }

  async deleteContact(id: string) {
    return await this.prisma.contact.delete({
      where: { id },
    });
  }

  async findContacts(userId: number, query: QueryContactsDto) {
    const { limit, page, search } = query;

    const where: Prisma.ContactWhereInput = {
      OR: [{ userId1: userId }, { userId2: userId }],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            {
              userId1: userId,
              user2: { name: { contains: search, mode: 'insensitive' } },
            },
            {
              userId2: userId,
              user1: { name: { contains: search, mode: 'insensitive' } },
            },
          ],
        },
      ];
    }

    return await Promise.all([
      this.prisma.contact.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { updatedAt: 'desc' },
        include: ContactInclude,
      }),
      this.prisma.contact.count({ where }),
    ]);
  }
}
