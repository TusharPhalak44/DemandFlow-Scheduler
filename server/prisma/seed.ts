import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Admin
  const adminEmail = 'admin@meetingcalendar.com';
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log('Created default admin: admin@meetingcalendar.com (Password: AdminPassword123!)');
  }

  // 2. Calendar Settings
  await prisma.calendarSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'DemandFlow Scheduler',
      schedulingTimezone: 'America/New_York',
      autoFederalHolidays: true,
      minAdvanceHours: 2,
      maxAdvanceDays: 60,
      prospectEmailRequired: true,
    },
  });
  console.log('Upserted default calendar settings');

  // 3. Working Hours (Mon - Fri: 09:00 - 17:00, Sat - Sun: off)
  const days = [
    { dayOfWeek: 1, dayName: 'Monday', isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, dayName: 'Thursday', isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, dayName: 'Friday', isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, dayName: 'Saturday', isWorkingDay: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 7, dayName: 'Sunday', isWorkingDay: false, startTime: '09:00', endTime: '17:00' },
  ];

  for (const d of days) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: d.dayOfWeek },
      update: {
        dayName: d.dayName,
        isWorkingDay: d.isWorkingDay,
        startTime: d.startTime,
        endTime: d.endTime,
      },
      create: d,
    });
  }
  console.log('Upserted default working hours (Mon-Fri 09:00-17:00)');

  // 4. Slot Settings (20 min meetings, 3 slots/hr, 0 min buffer = 24 slots/day)
  await prisma.slotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      meetingDurationMinutes: 20,
      slotsPerHour: 3,
      bufferMinutes: 0,
    },
  });
  console.log('Upserted default slot settings (20 min, 3 slots/hr, 0 buffer)');

  // 5. Booking Fields
  const fields = [
    { fieldName: 'agent_name', fieldLabel: 'Agent Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
    { fieldName: 'agent_email', fieldLabel: 'Agent Email', fieldType: 'email', isRequired: true, sortOrder: 2 },
    { fieldName: 'prospect_name', fieldLabel: 'Prospect Name', fieldType: 'text', isRequired: true, sortOrder: 3 },
    { fieldName: 'prospect_email', fieldLabel: 'Prospect Email', fieldType: 'email', isRequired: true, sortOrder: 4 },
    { fieldName: 'company_name', fieldLabel: 'Company Name', fieldType: 'text', isRequired: true, sortOrder: 5 },
    { fieldName: 'meeting_purpose', fieldLabel: 'Meeting Purpose', fieldType: 'text', isRequired: true, sortOrder: 6 },
    { fieldName: 'meeting_notes', fieldLabel: 'Meeting Notes', fieldType: 'textarea', isRequired: false, sortOrder: 7 },
  ];

  for (const f of fields) {
    await prisma.bookingField.upsert({
      where: { fieldName: f.fieldName },
      update: f,
      create: f,
    });
  }
  console.log('Upserted default booking fields');

  // 6. Sample Agents & Booking Links
  const agent1 = await prisma.agent.upsert({
    where: { email: 'sarah.jenkins@company.com' },
    update: {},
    create: {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@company.com',
      phone: '+1 (555) 234-5678',
      status: 'ACTIVE',
      defaultTimezone: 'America/New_York',
    },
  });

  await prisma.bookingLink.upsert({
    where: { token: 'sarah-booking-2026' },
    update: {},
    create: {
      token: 'sarah-booking-2026',
      agentId: agent1.id,
      name: "Sarah's Direct Calendar",
      isActive: true,
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { email: 'david.miller@company.com' },
    update: {},
    create: {
      name: 'David Miller',
      email: 'david.miller@company.com',
      phone: '+1 (555) 987-6543',
      status: 'ACTIVE',
      defaultTimezone: 'America/Chicago',
    },
  });

  await prisma.bookingLink.upsert({
    where: { token: 'david-booking-2026' },
    update: {},
    create: {
      token: 'david-booking-2026',
      agentId: agent2.id,
      name: "David's Direct Calendar",
      isActive: true,
    },
  });

  // Global / General booking link
  await prisma.bookingLink.upsert({
    where: { token: 'general-schedule-link' },
    update: {},
    create: {
      token: 'general-schedule-link',
      name: 'General Booking Link',
      isActive: true,
    },
  });
  console.log('Upserted sample agents and booking links');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
