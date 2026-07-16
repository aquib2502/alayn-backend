import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, signupSchema } from './auth.schema';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/signup', validate({ body: signupSchema }), controller.signup);
router.post('/login', validate({ body: loginSchema }), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authMiddleware, controller.me);

export default router;
