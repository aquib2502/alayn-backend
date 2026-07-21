import { prisma, } from '../../config/prisma';
import { Prisma, Role } from "@prisma/client";

export class AuthRepository {

  async registerOwner(data: {
    user: {
      name: string;
      email: string;
      passwordHash: string;
      phoneNo: string;
    };

    business: {
      name: string;
      locationsCount: string;
      businessType: string;
      contactDetail: string;
    };
  }) {

    return prisma.$transaction(async (tx) => {

      // 1. Create Business

      const business = await tx.business.create({
        data: {
          name: data.business.name,
          locationsCount: data.business.locationsCount,
          businessType: data.business.businessType,
          contactDetail: data.business.contactDetail,
        },
      });

      // 2. Create User

      const user = await tx.user.create({
        data: {
          businessId: business.id,
          name: data.user.name,
          email: data.user.email,
          passwordHash: data.user.passwordHash,
          phoneNo: data.user.phoneNo,
          role: Role.BUSINESS_OWNER,
        },
      });

      return {
        business,
        user,
      };
    });

  }


  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        business: {
          include: {
            subscription: true,
          },
        },
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        business: {
          include: {
            subscription: true,
          },
        },
      },
    });
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            business: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteRefreshToken(tokenHash: string) {
    return prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  async deleteUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
