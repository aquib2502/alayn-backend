import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

router.post('/login', validate({ body: loginSchema }), controller.login);
router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
router.post('/logout', validate({ body: refreshSchema }), controller.logout);
router.post(
    "/register",
    validate({ body: registerSchema }),
    controller.register
);
export default router;
