import * as ics from 'ics';
import { DateTime } from 'luxon';

export interface IcsMeetingData {
  bookingReference: string;
  agentName: string;
  agentEmail: string;
  prospectName: string;
  prospectEmail?: string | null;
  companyName: string;
  meetingPurpose: string;
  meetingNotes?: string | null;
  slotStartUtc: Date | string;
  slotEndUtc: Date | string;
  bookedTimezone: string;
}

export class IcsService {
  static generateIcs(meeting: IcsMeetingData): Promise<string> {
    return new Promise((resolve, reject) => {
      const startDt = DateTime.fromJSDate(
        meeting.slotStartUtc instanceof Date ? meeting.slotStartUtc : new Date(meeting.slotStartUtc)
      ).toUTC();

      const endDt = DateTime.fromJSDate(
        meeting.slotEndUtc instanceof Date ? meeting.slotEndUtc : new Date(meeting.slotEndUtc)
      ).toUTC();

      const durationMinutes = Math.max(1, Math.round(endDt.diff(startDt, 'minutes').minutes));

      const event: ics.EventAttributes = {
        start: [startDt.year, startDt.month, startDt.day, startDt.hour, startDt.minute],
        duration: { minutes: durationMinutes },
        title: `Meeting: ${meeting.prospectName} (${meeting.companyName}) & ${meeting.agentName}`,
        description: [
          `Meeting Reference: ${meeting.bookingReference}`,
          `Prospect: ${meeting.prospectName} (${meeting.companyName})`,
          meeting.prospectEmail ? `Prospect Email: ${meeting.prospectEmail}` : '',
          `Agent: ${meeting.agentName} (${meeting.agentEmail})`,
          `Purpose: ${meeting.meetingPurpose}`,
          meeting.meetingNotes ? `Notes: ${meeting.meetingNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        location: 'Online Conference / Virtual Meeting',
        organizer: {
          name: meeting.agentName,
          email: meeting.agentEmail,
        },
        attendees: meeting.prospectEmail
          ? [
              {
                name: meeting.prospectName,
                email: meeting.prospectEmail,
                rsvp: true,
              },
            ]
          : [],
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        alarms: [
          {
            action: 'display',
            description: 'Upcoming Meeting Reminder',
            trigger: { minutes: 15, before: true },
          },
        ],
      };

      ics.createEvent(event, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }
}
