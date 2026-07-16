import { prisma } from '../../config/prisma';

export class AuthRepository {
  async createTenantUser(tenantName: string, userName: string, email: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
        },
      });

      // 2. Create Active Subscription for Tenant
      // Ends 30 days from now
      const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          planId: 'BASIC',
          currentPeriodEnd,
        },
      });

      // 3. Create Tenant Owner User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          name: userName,
          role: 'TENANT_OWNER',
        },
      });

      return { user, tenant };
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        tenant: {
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
        tenant: {
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
            tenant: {
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
