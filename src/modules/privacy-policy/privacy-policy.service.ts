import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export enum PolicyId {
  PRIVACY_POLICY = 'privacy-policy',
  TERM_AND_CONDITION = 'term-and-condition',
  COMMUNITY_GUIDELINES = 'community-guidelines',
}

@Injectable()
export class PrivacyPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(id: PolicyId): Promise<{ id: string; data: string | null }> {
    const policy = await this.prisma.privacyPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      return { id, data: PolicyId[id] };
    }

    return policy;
  }

  async updatePolicy(
    id: PolicyId,
    data: string,
  ): Promise<{ id: string; data: string | null }> {
    return this.prisma.privacyPolicy.upsert({
      where: { id },
      update: { data },
      create: { id, data },
    });
  }
}
