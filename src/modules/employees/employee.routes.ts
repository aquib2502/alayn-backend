import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { EmployeeController } from './employee.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema, createLeaveRequestSchema, updateLeaveRequestStatusSchema } from './employee.schema';
import { AppError } from '../../utils/AppError';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('INVALID_FILE_TYPE', 'Only PDF, JPEG, PNG, or Word documents are allowed', 400) as any, false);
    }
  },
});

const router = Router();
const controller = new EmployeeController();

// All routes require authentication & outlet scoping
router.use(authMiddleware);
router.use(tenantMiddleware);

// Only OWNER & MANAGER can perform employee profile actions
router.post('/', authorize('OWNER', 'MANAGER'), validate({ body: createEmployeeSchema }), controller.create);
router.get('/', authorize('OWNER', 'MANAGER'), controller.list);
router.patch('/:id', authorize('OWNER', 'MANAGER'), validate({ body: updateEmployeeSchema }), controller.update);
router.delete('/:id', authorize('OWNER', 'MANAGER'), controller.delete);

// Document upload route
router.post('/:id/documents', authorize('OWNER', 'MANAGER'), upload.single('document'), controller.uploadDocument);

// Leave Requests Router
const leaveRouter = Router();
leaveRouter.use(authMiddleware);
leaveRouter.use(tenantMiddleware);

leaveRouter.post('/', authorize('OWNER', 'MANAGER', 'STAFF'), validate({ body: createLeaveRequestSchema }), controller.createLeave);
leaveRouter.patch('/:id', authorize('OWNER', 'MANAGER'), validate({ body: updateLeaveRequestStatusSchema }), controller.updateLeaveStatus);

export { leaveRouter };
export default router;
