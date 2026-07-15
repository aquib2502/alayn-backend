import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

export class AuthService {
  private authRepository = new AuthRepository();

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(user: { id: string; email: string; role: string; name: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
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

    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = this.generateRefreshToken();
    const refreshHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.authRepository.createRefreshToken(user.id, refreshHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
    const accessToken = this.generateAccessToken(user);

    return { accessToken };
  }

  async logout(refreshToken: string) {
    const refreshHash = this.hashToken(refreshToken);
    await this.authRepository.deleteRefreshToken(refreshHash);
  }
}
