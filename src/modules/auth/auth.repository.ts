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
    outlet: {
      name: string;
      address: string;
      city: string;
      state: string;
      country: string;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.user.name,
          email: data.user.email,
          passwordHash: data.user.passwordHash,
          phoneNo: data.user.phoneNo,
          role: Role.OWNER,
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          name: data.outlet.name,
          address: data.outlet.address,
          city: data.outlet.city,
          state: data.outlet.state,
          country: data.outlet.country,
        },
      });

      await tx.userOutlet.create({
        data: {
          userId: user.id,
          outletId: outlet.id,
        },
      });

      return { user, outlet };
    });
  }


  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
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
      include: { user: true },
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
