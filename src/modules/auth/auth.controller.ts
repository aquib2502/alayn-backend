import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Helper to set HTTP-Only cookies
const setTokenCookies = (res: Response, token: string, refreshToken?: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    const refreshMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
    });
  }
};

const getCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value ?? null;
  }
  return null;
};

export class AuthController {
  private authService = new AuthService();


  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.authService.register(req.body);

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);

      setTokenCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, {
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getCookie(req, 'refreshToken');
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const result = await this.authService.refresh(refreshToken);
      setTokenCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, {
        message: 'Token refreshed successfully',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getCookie(req, 'refreshToken');
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      const isProduction = process.env.NODE_ENV === 'production';
      res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });

      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const result = await this.authService.getMe(userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
export default AuthController;
