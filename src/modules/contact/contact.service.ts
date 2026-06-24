import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactRepository } from './repositories/contact.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { NotificationService } from '@/infra/notification/notification.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { RespondContactRequestDto } from './dto/respond-contact-request.dto';
import { UpdateAliasDto } from './dto/update-alias.dto';
import {
  QueryContactRequestsDto,
  QueryContactsDto,
} from './dto/query-contact.dto';
import { QueryNearbyFamiliesDto } from './dto/query-nearby.dto';
import { NotificationType } from '@/infra/notification/notification.constants';

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly userRepo: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async sendContactRequest(senderId: number, dto: CreateContactRequestDto) {
    const { receiverId, message } = dto;

    if (senderId === receiverId) {
      throw new BadRequestException(
        'You cannot send a contact request to yourself',
      );
    }

    const receiver = await this.userRepo.findById(receiverId);
    if (!receiver) {
      throw new NotFoundException(
        'Unable to send contact request. Please try again later',
      );
    }

    const sender = await this.userRepo.findById(senderId);

    // Check for existing request or contact
    const existingRequest = await this.contactRepo.findRequestBetweenUsers(
      senderId,
      receiverId,
    );
    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        if (existingRequest.receiverId === senderId) {
          // Current sender (B) is accepting the pending request sent by the other user (A)
          const updatedRequest = await this.contactRepo.updateRequestStatus(
            existingRequest.id,
            'ACCEPTED',
            new Date(),
          );

          // Create confirmed contact connection
          await this.contactRepo.createContact(
            existingRequest.senderId,
            existingRequest.receiverId,
          );

          // Send accepted notification to original sender (A)
          const receiver = await this.userRepo.findById(senderId);
          try {
            await this.notificationService.sendNotification({
              userIds: [existingRequest.senderId],
              title: 'Contact Request Accepted',
              message: `${receiver?.name || 'Someone'} accepted your contact request`,
              type: NotificationType.CONTACT_ACCEPTED,
            });
          } catch {
            // Suppress notification issues
          }

          return updatedRequest;
        }

        throw new ConflictException(
          'A pending contact request already exists between you',
        );
      }
      if (existingRequest.status === 'ACCEPTED') {
        throw new ConflictException('You are already contacts');
      }
      // If DECLINED or CANCELLED, we delete it so we can create a new PENDING one
      await this.contactRepo.deleteRequest(existingRequest.id);
    }

    const request = await this.contactRepo.createRequest(
      senderId,
      receiverId,
      message,
    );

    // Send push notification
    try {
      await this.notificationService.sendNotification({
        userIds: [receiverId],
        title: 'New Contact Request',
        message: `${sender?.name || 'Someone'} sent you a contact request`,
        type: NotificationType.CONTACT_REQUEST,
      });
    } catch {
      // Don't fail the request if notification queue fails
    }

    return request;
  }

  async getIncomingRequests(userId: number, query: QueryContactRequestsDto) {
    return await this.contactRepo.findIncomingRequests(userId, query);
  }

  async getOutgoingRequests(userId: number, query: QueryContactRequestsDto) {
    return await this.contactRepo.findOutgoingRequests(userId, query);
  }

  async respondToRequest(
    userId: number,
    requestId: string,
    dto: RespondContactRequestDto,
  ) {
    const { status } = dto;

    const request = await this.contactRepo.findRequestById(requestId);
    if (!request) {
      throw new NotFoundException('Contact request not found');
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to respond to this request',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'This request has already been responded to',
      );
    }

    const updatedRequest = await this.contactRepo.updateRequestStatus(
      requestId,
      status,
      new Date(),
    );

    if (status === 'ACCEPTED') {
      // Create confirmed contact connection
      await this.contactRepo.createContact(
        request.senderId,
        request.receiverId,
      );

      // Send accepted notification to sender
      const receiver = await this.userRepo.findById(userId);
      try {
        await this.notificationService.sendNotification({
          userIds: [request.senderId],
          title: 'Contact Request Accepted',
          message: `${receiver?.name || 'Someone'} accepted your contact request`,
          type: NotificationType.CONTACT_ACCEPTED,
        });
      } catch {
        // Suppress notification issues
      }
    }

    return updatedRequest;
  }

  async cancelRequest(userId: number, requestId: string) {
    const request = await this.contactRepo.findRequestById(requestId);
    if (!request) {
      throw new NotFoundException('Contact request not found');
    }

    if (request.senderId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this request',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    await this.contactRepo.updateRequestStatus(
      requestId,
      'CANCELLED',
      new Date(),
    );
    return { success: true };
  }

  async getContacts(userId: number, query: QueryContactsDto) {
    const [contacts, total] = await this.contactRepo.findContacts(
      userId,
      query,
    );

    const mappedContacts = contacts.map((c) => this.mapContact(c, userId));
    return [mappedContacts, total] as const;
  }

  async updateAlias(userId: number, contactId: string, dto: UpdateAliasDto) {
    const { alias } = dto;

    const contact = await this.contactRepo.findContactById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId1 !== userId && contact.userId2 !== userId) {
      throw new ForbiddenException(
        'You are not authorized to edit this contact',
      );
    }

    const updated = await this.contactRepo.updateContactAlias(
      contactId,
      userId,
      alias ?? null,
    );
    return this.mapContact(updated, userId);
  }

  async blockContact(userId: number, contactId: string) {
    const contact = await this.contactRepo.findContactById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId1 !== userId && contact.userId2 !== userId) {
      throw new ForbiddenException(
        'You are not authorized to block this contact',
      );
    }

    if (contact.isBlocked) {
      throw new BadRequestException('This contact is already blocked');
    }

    const updated = await this.contactRepo.blockContact(contactId, userId);
    return this.mapContact(updated, userId);
  }

  async unblockContact(userId: number, contactId: string) {
    const contact = await this.contactRepo.findContactById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId1 !== userId && contact.userId2 !== userId) {
      throw new ForbiddenException(
        'You are not authorized to unblock this contact',
      );
    }

    if (!contact.isBlocked) {
      throw new BadRequestException('This contact is not blocked');
    }

    if (contact.blockedBy !== userId) {
      throw new ForbiddenException(
        'You did not initiate the block on this contact',
      );
    }

    await this.contactRepo.deleteContact(contactId);
  }

  async removeContact(userId: number, contactId: string) {
    const contact = await this.contactRepo.findContactById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId1 !== userId && contact.userId2 !== userId) {
      throw new ForbiddenException(
        'You are not authorized to remove this contact',
      );
    }

    // Delete contact record
    await this.contactRepo.deleteContact(contactId);

    // Also reset related ContactRequest so they can request again if needed
    const request = await this.contactRepo.findRequestBetweenUsers(
      contact.userId1,
      contact.userId2,
    );
    if (request) {
      await this.contactRepo.deleteRequest(request.id);
    }

    return { success: true };
  }

  async blockUser(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    let contact = await this.contactRepo.findContactBetweenUsers(
      userId,
      targetUserId,
    );
    if (!contact) {
      contact = await this.contactRepo.createContact(userId, targetUserId);
    }

    if (contact.isBlocked) {
      throw new BadRequestException('This user is already blocked');
    }

    const updated = await this.contactRepo.blockContact(contact.id, userId);
    return this.mapContact(updated, userId);
  }

  async unblockUser(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot unblock yourself');
    }

    const contact = await this.contactRepo.findContactBetweenUsers(
      userId,
      targetUserId,
    );
    if (!contact) {
      throw new NotFoundException('Contact connection not found');
    }

    if (!contact.isBlocked) {
      throw new BadRequestException('This user is not blocked');
    }

    if (contact.blockedBy !== userId) {
      throw new ForbiddenException(
        'You did not initiate the block on this user',
      );
    }

    await this.contactRepo.deleteContact(contact.id);
  }

  async getNearbyFamilies(userId: number, query: QueryNearbyFamiliesDto) {
    return await this.contactRepo.findNearbyFamilies(userId, query);
  }

  private mapContact(contact: any, currentUserId: number) {
    if (!contact) return null;

    const isUser1 = contact.userId1 === currentUserId;
    const contactUser = isUser1 ? contact.user2 : contact.user1;
    const alias = isUser1 ? contact.alias1 : contact.alias2;

    return {
      id: contact.id,
      contactUser,
      alias,
      isBlocked: contact.isBlocked,
      blockedByMe: contact.blockedBy === currentUserId,
      blockedAt: contact.blockedAt,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
