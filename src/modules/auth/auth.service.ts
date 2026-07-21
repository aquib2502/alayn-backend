import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import { AppError } from '../../utils/AppError';
import { generateToken, generateRefreshToken } from '../../utils/jwt';

export class AuthService {
  private authRepository = new AuthRepository();

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateUserAccessToken(user: { id: string; email: string; role: string; name: string; businessId?: string | null }) {
    return generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      businessId: user.businessId,
    });
  }

  private generateUserRefreshToken(user: { id: string; email: string; role: string; name: string; businessId?: string | null }) {
    return generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      businessId: user.businessId,
    });
  }


  async register(data: {
    user: {
      name: string;
      email: string;
      password: string;
      phoneNo: string;
    };
    business: {
      name: string;
      locationsCount: string;
      businessType: string;
      contactDetail: string;
    };
  }) {

    // Check if email already exists
    const existingUser = await this.authRepository.findUserByEmail(
      data.user.email
    );

    if (existingUser) {
      throw new AppError(
        "EMAIL_ALREADY_EXISTS",
        "Email already exists.",
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.user.password, 10);

    // Create Owner
    const { user, business } =
      await this.authRepository.registerOwner({
        user: {
          name: data.user.name,
          email: data.user.email,
          passwordHash,
          phoneNo: data.user.phoneNo,
        },

        business: {
          name: data.business.name,
          locationsCount: data.business.locationsCount,
          businessType: data.business.businessType,
          contactDetail: data.business.contactDetail,
        },
      });

    return {
      message: "Registration successful. Please login to continue.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      business: {
        id: business.id,
        name: business.name,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const accessToken = this.generateUserAccessToken(user);
    const rawRefreshToken = this.generateUserRefreshToken(user);
    const refreshHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.authRepository.createRefreshToken(user.id, refreshHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        business: user.business,
      },
    };
  }

  async refresh(refreshToken: string) {
    const refreshHash = this.hashToken(refreshToken);
    const tokenRecord = await this.authRepository.findRefreshToken(refreshHash);

    if (!tokenRecord) {
      throw new AppError('INVALID_TOKEN', 'Refresh token is invalid', 401);
    }

    if (new Date() > tokenRecord.expiresAt) {
      await this.authRepository.deleteRefreshToken(refreshHash);
      throw new AppError('EXPIRED_TOKEN', 'Refresh token has expired', 401);
    }

    const user = tokenRecord.user;
    const accessToken = this.generateUserAccessToken(user);
    const newRawRefreshToken = this.generateUserRefreshToken(user);
    const newRefreshHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Delete old refresh token, save new one
    await this.authRepository.deleteRefreshToken(refreshHash);
    await this.authRepository.createRefreshToken(user.id, newRefreshHash, expiresAt);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        business: user.business,
      },
    };
  }

  async logout(refreshToken: string) {
    const refreshHash = this.hashToken(refreshToken);
    await this.authRepository.deleteRefreshToken(refreshHash);
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      business: user.business,
    };
  }
}
