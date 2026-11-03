import { Router } from 'express';
import { authenticateAdmin } from '../middlewares/authMiddleware.js';
import { AuthController } from '../controllers/authController.js';
import { ReportsController } from '../controllers/reportsController.js';
import { BookingController } from '../controllers/bookingController.js';
import { SettingsController } from '../controllers/settingsController.js';
import { HolidayController } from '../controllers/holidayController.js';
import { AgentController } from '../controllers/agentController.js';
import { ActivityLogController } from '../controllers/activityLogController.js';

const router = Router();

// Protect all admin routes with JWT authentication
router.use(authenticateAdmin);

// 1. Dashboard & Reports
router.get('/dashboard/stats', ReportsController.getDashboardStats);

// 2. Bookings Management
router.get('/bookings', BookingController.adminListBookings);
router.get('/bookings/export/csv', BookingController.adminExportCsv);
router.patch('/bookings/:id/status', BookingController.adminUpdateStatus);
router.post('/bookings/:id/cancel', BookingController.adminCancelBooking);
router.post('/bookings/:id/reschedule', BookingController.adminRescheduleBooking);

// 3. Working Hours Management
router.get('/working-hours', SettingsController.getWorkingHours);
router.put('/working-hours', SettingsController.updateWorkingHours);

// 4. Slot Configuration
router.get('/slot-settings', SettingsController.getSlotSettings);
router.put('/slot-settings', SettingsController.updateSlotSettings);

// 5. Holiday Management
router.get('/holidays', HolidayController.listHolidays);
router.post('/holidays', HolidayController.createCustomHoliday);
router.delete('/holidays/:id', HolidayController.deleteHoliday);
router.patch('/holidays/federal/toggle', HolidayController.toggleFederalHolidays);

// 6. Agent Management & Booking Links
router.get('/agents', AgentController.listAgents);
router.post('/agents', AgentController.createAgent);
router.patch('/agents/:id', AgentController.updateAgent);
router.get('/booking-links', AgentController.listBookingLinks);
router.patch('/booking-links/:id/toggle', AgentController.toggleLinkStatus);

// 7. Admin Users & Credentials Management
router.get('/admins', AuthController.listAdmins);
router.post('/admins', AuthController.createAdmin);
router.put('/admins/:id/password', AuthController.resetAdminPassword);
router.patch('/admins/:id/status', AuthController.toggleAdminStatus);
router.delete('/admins/:id', AuthController.deleteAdmin);

// 8. General Settings
router.get('/settings', SettingsController.getCalendarSettings);
router.put('/settings', SettingsController.updateCalendarSettings);

// 9. Activity Logs
router.get('/activity-logs', ActivityLogController.listLogs);

export default router;
