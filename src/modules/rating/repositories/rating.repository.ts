import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async rateUser(
    reviewerId: number,
    data: {
      subjectId: number;
      rating: number;
      comment?: string;
      carpoolId?: string;
    },
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: {
          reviewerId,
          subjectId: data.subjectId,
          type: 'USER',
        },
      });

      let review;
      if (existing) {
        review = await tx.review.update({
          where: { id: existing.id },
          data: {
            rating: data.rating,
            comment: data.comment,
            carpoolId: data.carpoolId,
          },
        });
      } else {
        review = await tx.review.create({
          data: {
            type: 'USER',
            rating: data.rating,
            comment: data.comment,
            reviewerId,
            subjectId: data.subjectId,
            carpoolId: data.carpoolId,
          },
        });
      }

      const aggregate = await tx.review.aggregate({
        where: { subjectId: data.subjectId, type: 'USER' },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avgRating = aggregate._avg.rating ?? 0;
      const count = aggregate._count.rating ?? 0;

      await tx.user.update({
        where: { id: data.subjectId },
        data: {
          rating: avgRating,
          ratingCount: count,
        },
      });

      return review;
    });
  }

  async rateCarpool(
    reviewerId: number,
    data: {
      carpoolId: string;
      rating: number;
      comment?: string;
    },
  ) {
    const existing = await this.prisma.review.findFirst({
      where: {
        reviewerId,
        carpoolId: data.carpoolId,
        type: 'CARPOOL',
      },
    });

    if (existing) {
      return await this.prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: data.rating,
          comment: data.comment,
        },
      });
    }

    return await this.prisma.review.create({
      data: {
        type: 'CARPOOL',
        rating: data.rating,
        comment: data.comment,
        reviewerId,
        carpoolId: data.carpoolId,
      },
    });
  }

  async findReviewsGiven(userId: number, limit: number, page: number) {
    const where: Prisma.ReviewWhereInput = { reviewerId: userId };
    const [data, total, breakdownRaw] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              profilePicture: { select: { url: true } },
            },
          },
          carpool: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of breakdownRaw) {
      const ratingVal = Math.round(Number(item.rating));
      if (ratingVal >= 1 && ratingVal <= 5) {
        breakdown[ratingVal as 1 | 2 | 3 | 4 | 5] += item._count.rating;
      }
    }

    return [data, total, breakdown] as const;
  }

  async findReviewsReceived(userId: number, limit: number, page: number) {
    const where: Prisma.ReviewWhereInput = { subjectId: userId, type: 'USER' };
    const [data, total, breakdownRaw] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              profilePicture: { select: { url: true } },
            },
          },
          carpool: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of breakdownRaw) {
      const ratingVal = Math.round(Number(item.rating));
      if (ratingVal >= 1 && ratingVal <= 5) {
        breakdown[ratingVal as 1 | 2 | 3 | 4 | 5] += item._count.rating;
      }
    }

    return [data, total, breakdown] as const;
  }
}
