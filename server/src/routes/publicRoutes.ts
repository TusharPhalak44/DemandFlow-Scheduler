import { Router } from 'express';
import { CalendarController } from '../controllers/calendarController.js';
import { BookingController } from '../controllers/bookingController.js';

const router = Router();

// Calendar & Slot Availability
router.get('/calendar/timezones', CalendarController.getTimezones);
router.get('/calendar/available-dates', CalendarController.getAvailableDates);
router.get('/calendar/slots', CalendarController.getSlotsForDate);
router.get('/booking-link/:token', CalendarController.resolveBookingLink);

// Booking actions
router.post('/bookings', BookingController.bookMeeting);
router.get('/bookings/:reference', BookingController.getBookingByReference);
router.get('/bookings/:reference/ics', BookingController.downloadIcs);

export default router;
