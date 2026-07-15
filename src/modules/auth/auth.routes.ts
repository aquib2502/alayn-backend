import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, refreshSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

router.post('/login', validate({ body: loginSchema }), controller.login);
router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
router.post('/logout', validate({ body: refreshSchema }), controller.logout);

export default router;
