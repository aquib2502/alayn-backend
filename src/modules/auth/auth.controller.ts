import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Helper to set HTTP-Only cookies
const setTokenCookies = (res: Response, token: string, refreshToken?: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    domain: isProduction ? '.alaynai.com' : undefined,
  };

  res.cookie('token', token, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    const refreshMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: refreshMaxAge,
    });
  }
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
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string);

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No refresh token provided',
          },
        });
      }

      const result = await this.authService.refresh(refreshToken);
      setTokenCookies(res, result.accessToken, result.refreshToken);

      return sendSuccess(res, {
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string);

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        domain: isProduction ? '.alaynai.com' : undefined,
        path: '/',
      };
      res.clearCookie('token', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

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
