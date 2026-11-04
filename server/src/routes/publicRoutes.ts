import { Router } from 'express';
import { CalendarController } from '../controllers/calendarController.js';
import { BookingController } from '../controllers/bookingController.js';
import { ClientController } from '../controllers/clientController.js';

const router = Router();

// Clients (Client Codes e.g. 1050, 4020)
router.get('/clients', ClientController.listPublicClients);
router.get('/clients/:clientCode', ClientController.getPublicClientByCode);

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
