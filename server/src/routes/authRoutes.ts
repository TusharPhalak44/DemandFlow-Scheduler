import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticateAdmin, AuthController.me);
router.post('/change-password', authenticateAdmin, AuthController.changePassword);

export default router;
