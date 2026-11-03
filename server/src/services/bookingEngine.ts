import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database.js';
import { BOOKING_STATUS, BookingStatusType } from '../config/constants.js';
import { logActivity } from '../middlewares/auditLogger.js';
import crypto from 'crypto';

export interface CreateBookingInput {
  agentId?: number | null;
  bookingLinkId?: number | null;
  agentName: string;
  agentEmail?: string | null;
  prospectName?: string | null;
  prospectEmail: string;
  companyName?: string | null;
  meetingPurpose?: string | null;
  meetingNotes?: string | null;
  slotStartUtc: string; // ISO string
  slotEndUtc: string;   // ISO string
  bookedTimezone: string;
  ipAddress?: string;
}

export class BookingEngine {
  /**
   * Generates a unique, friendly booking reference (e.g. MTG-202611-7F89A)
   */
  static generateReference(): string {
    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `MTG-${yearMonth}-${randomHex}`;
  }

  /**
   * Creates a confirmed booking and locks the slot atomically in slot_inventory.
   * Double-booking is physically prevented by the unique constraint on slot_start_utc.
   */
  static async createBooking(input: CreateBookingInput) {
    const startUtcDate = new Date(input.slotStartUtc);
    const endUtcDate = new Date(input.slotEndUtc);

    if (isNaN(startUtcDate.getTime()) || isNaN(endUtcDate.getTime())) {
      throw new Error('Invalid date/time format for slotStartUtc or slotEndUtc.');
    }

    if (startUtcDate <= new Date()) {
      throw new Error('Cannot book a time slot in the past.');
    }

    // Generate unique reference
    let reference = this.generateReference();
    let collisionCheck = await prisma.booking.findUnique({ where: { bookingReference: reference } });
    while (collisionCheck) {
      reference = this.generateReference();
      collisionCheck = await prisma.booking.findUnique({ where: { bookingReference: reference } });
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if slot already reserved
      const existingLock = await tx.slotInventory.findUnique({
        where: { slotStartUtc: startUtcDate },
      });

      if (existingLock) {
        const error = new Error('This slot is already booked. Please choose another available time.');
        (error as any).code = 'SLOT_ALREADY_BOOKED';
        throw error;
      }

      // 2. Create booking
      const fallbackProspectName = input.prospectName || (input.prospectEmail ? input.prospectEmail.split('@')[0] : 'Prospect');
      const fallbackCompany = input.companyName || (input.prospectEmail ? input.prospectEmail.split('@')[1] : 'General');
      const fallbackAgentEmail = input.agentEmail || `${input.agentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@demandflow.com`;
      const fallbackPurpose = input.meetingPurpose || 'Meeting Consultation';

      const booking = await tx.booking.create({
        data: {
          bookingReference: reference,
          agentId: input.agentId || null,
          bookingLinkId: input.bookingLinkId || null,
          agentName: input.agentName,
          agentEmail: fallbackAgentEmail,
          prospectName: fallbackProspectName,
          prospectEmail: input.prospectEmail,
          companyName: fallbackCompany,
          meetingPurpose: fallbackPurpose,
          meetingNotes: input.meetingNotes || null,
          slotStartUtc: startUtcDate,
          slotEndUtc: endUtcDate,
          bookedTimezone: input.bookedTimezone,
          status: BOOKING_STATUS.CONFIRMED,
        },
      });

      // 3. Insert unique allocation into slot_inventory
      await tx.slotInventory.create({
        data: {
          slotStartUtc: startUtcDate,
          bookingId: booking.id,
          status: 'BOOKED',
        },
      });

      // Increment click/booking count on booking link if provided
      if (input.bookingLinkId) {
        await tx.bookingLink.update({
          where: { id: input.bookingLinkId },
          data: { clicksCount: { increment: 1 } },
        });
      }

      return booking;
    });

    // Log activity
    await logActivity({
      actionType: 'BOOKING_CONFIRMED',
      entityType: 'BOOKING',
      entityId: result.bookingReference,
      details: {
        prospect: result.prospectName,
        company: result.companyName,
        agent: result.agentName,
        slotStartUtc: result.slotStartUtc,
      },
      ipAddress: input.ipAddress,
    });

    return result;
  }

  /**
   * Cancels a booking, releasing the slot in slot_inventory while preserving booking history
   */
  static async cancelBooking(params: {
    bookingId: number;
    cancelledBy: 'ADMIN' | 'AGENT';
    adminId?: number;
    reason?: string;
    ipAddress?: string;
  }) {
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: { slotAllocation: true },
    });

    if (!booking) {
      throw new Error(`Booking with ID ${params.bookingId} not found.`);
    }

    if (
      booking.status === BOOKING_STATUS.CANCELLED_BY_ADMIN ||
      booking.status === BOOKING_STATUS.CANCELLED_BY_AGENT
    ) {
      throw new Error('This booking has already been cancelled.');
    }

    const newStatus =
      params.cancelledBy === 'ADMIN'
        ? BOOKING_STATUS.CANCELLED_BY_ADMIN
        : BOOKING_STATUS.CANCELLED_BY_AGENT;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Release slot from slot_inventory
      if (booking.slotAllocation) {
        await tx.slotInventory.delete({
          where: { id: booking.slotAllocation.id },
        });
      }

      // 2. Update booking record
      return await tx.booking.update({
        where: { id: params.bookingId },
        data: {
          status: newStatus,
          cancellationReason: params.reason || null,
        },
      });
    });

    // Log activity
    await logActivity({
      adminId: params.adminId,
      actionType: `BOOKING_${newStatus}`,
      entityType: 'BOOKING',
      entityId: updatedBooking.bookingReference,
      details: {
        cancelledBy: params.cancelledBy,
        reason: params.reason,
        releasedSlot: booking.slotStartUtc,
      },
      ipAddress: params.ipAddress,
    });

    return updatedBooking;
  }

  /**
   * Reschedules a booking to a new time slot
   */
  static async rescheduleBooking(params: {
    bookingId: number;
    newSlotStartUtc: string;
    newSlotEndUtc: string;
    adminId?: number;
    reason?: string;
    ipAddress?: string;
  }) {
    const originalBooking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: { slotAllocation: true },
    });

    if (!originalBooking) {
      throw new Error(`Original booking ${params.bookingId} not found.`);
    }

    const newStartUtc = new Date(params.newSlotStartUtc);
    const newEndUtc = new Date(params.newSlotEndUtc);

    const newBookingReference = this.generateReference();

    const { newBooking, oldBooking } = await prisma.$transaction(async (tx) => {
      // 1. Release old slot
      if (originalBooking.slotAllocation) {
        await tx.slotInventory.delete({
          where: { id: originalBooking.slotAllocation.id },
        });
      }

      // 2. Update old booking status to RESCHEDULED
      const oldB = await tx.booking.update({
        where: { id: originalBooking.id },
        data: {
          status: BOOKING_STATUS.RESCHEDULED,
          cancellationReason: `Rescheduled to ${newBookingReference}. Reason: ${params.reason || 'None provided'}`,
        },
      });

      // 3. Create new booking
      const newB = await tx.booking.create({
        data: {
          bookingReference: newBookingReference,
          agentId: originalBooking.agentId,
          bookingLinkId: originalBooking.bookingLinkId,
          agentName: originalBooking.agentName,
          agentEmail: originalBooking.agentEmail,
          prospectName: originalBooking.prospectName,
          prospectEmail: originalBooking.prospectEmail,
          companyName: originalBooking.companyName,
          meetingPurpose: originalBooking.meetingPurpose,
          meetingNotes: originalBooking.meetingNotes,
          slotStartUtc: newStartUtc,
          slotEndUtc: newEndUtc,
          bookedTimezone: originalBooking.bookedTimezone,
          status: BOOKING_STATUS.CONFIRMED,
          rescheduledFromId: originalBooking.id,
        },
      });

      // 4. Reserve new slot in slot_inventory
      await tx.slotInventory.create({
        data: {
          slotStartUtc: newStartUtc,
          bookingId: newB.id,
          status: 'BOOKED',
        },
      });

      return { newBooking: newB, oldBooking: oldB };
    });

    await logActivity({
      adminId: params.adminId,
      actionType: 'BOOKING_RESCHEDULED',
      entityType: 'BOOKING',
      entityId: newBookingReference,
      details: {
        fromReference: originalBooking.bookingReference,
        oldSlot: originalBooking.slotStartUtc,
        newSlot: newStartUtc,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
    });

    return { newBooking, oldBooking };
  }
}
