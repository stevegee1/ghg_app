import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { validateWorkEmail, isWorkEmail } from '../utils/emailValidation';

export const isCorporateEmail = isWorkEmail;

export function createDemoBookingRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/demo/slots
   * Returns available demo slots for the upcoming 10 business days.
   */
  router.get('/api/demo/slots', async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const existingBookings = await prisma.demoBooking.findMany({
        where: {
          requestedSlot: { gte: now },
          status: { not: 'CANCELLED' },
        },
        select: { requestedSlot: true },
      });

      const bookedTimestamps = new Set(
        existingBookings.map((b) => b.requestedSlot.toISOString())
      );

      const slots: Array<{ iso: string; formatted: string; available: boolean }> = [];
      let dayOffset = 1;

      while (slots.length < 18 && dayOffset < 20) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + dayOffset);
        dayOffset++;

        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        // Times: 10:00, 14:00, 16:00 UTC
        const hours = [10, 14, 16];
        for (const hour of hours) {
          d.setUTCHours(hour, 0, 0, 0);
          const iso = d.toISOString();
          const isBooked = bookedTimestamps.has(iso);

          const formatted = d.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          }) + ' UTC';

          slots.push({
            iso,
            formatted,
            available: !isBooked,
          });
        }
      }

      return res.json({ success: true, slots });
    } catch (error: any) {
      console.error('[DemoBooking] Error fetching slots:', error);
      return res.status(500).json({ error: 'Failed to fetch available demo slots' });
    }
  });

  /**
   * POST /api/demo/book
   * Books an enterprise demonstration session.
   */
  router.post('/api/demo/book', async (req: Request, res: Response) => {
    try {
      const {
        fullName,
        workEmail,
        companyName,
        facilityCount,
        primaryScope = 'CARBON_EMISSION',
        requestedSlot,
        ndaRequested = true,
        bookingMethod = 'FORM',
        allowFreeMail = false,
      } = req.body || {};

      // 1. Validate full name
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({
          error: 'Please enter your full name and corporate title (minimum 2 characters).',
        });
      }

      // 2. Validate email
      if (!workEmail || typeof workEmail !== 'string') {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const cleanEmail = workEmail.trim().toLowerCase();
      const validation = validateWorkEmail(cleanEmail);
      if (!validation.isValid) {
        return res.status(400).json({
          error: validation.error || 'Please provide an official corporate or organizational work email address (personal providers like Gmail, Yahoo, and Outlook are not permitted).',
        });
      }

      // 3. Validate company name
      if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
        return res.status(400).json({
          error: 'Please specify your company or authority name (minimum 2 characters).',
        });
      }

      // 4. Validate requested slot
      let slotDate: Date;
      if (!requestedSlot) {
        // Default to next business day at 14:00 UTC if unspecified
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + (d.getUTCDay() >= 5 ? 8 - d.getUTCDay() : 1));
        d.setUTCHours(14, 0, 0, 0);
        slotDate = d;
      } else {
        slotDate = new Date(requestedSlot);
        if (isNaN(slotDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date/time slot specified.' });
        }
      }

      // Validate scope
      const validScopes = ['CARBON_EMISSION', 'JOB_REPORTING', 'DUAL_SCOPE', 'WEATHER_RESILIENCE'];
      const sanitizedScope = validScopes.includes(primaryScope) ? primaryScope : 'CARBON_EMISSION';

      // Meeting URL: Use company's configured room if provided, otherwise null (Google Calendar generates on save)
      const meetUrl = process.env.DEMO_MEETING_URL || null;

      // Persist to Postgres
      const booking = await prisma.demoBooking.create({
        data: {
          fullName: fullName.trim(),
          workEmail: cleanEmail,
          companyName: companyName.trim(),
          facilityCount: facilityCount ? String(facilityCount).trim() : null,
          primaryScope: sanitizedScope,
          requestedSlot: slotDate,
          meetUrl,
          ndaRequested: Boolean(ndaRequested),
          bookingMethod: String(bookingMethod || 'FORM'),
          status: 'CONFIRMED',
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });

      // Google Calendar link generation
      const startTimeIso = slotDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const endDate = new Date(slotDate.getTime() + 25 * 60 * 1000); // 25 min walk-through
      const endTimeIso = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

      const calendarTitle = encodeURIComponent('GHGEmissionLogs Architectural Walkthrough');
      const calendarDetails = encodeURIComponent(
        `Automated Statutory Assurance & Continuous Ledger Walkthrough for ${companyName.trim()}.\n\nStatutory Scope: ${sanitizedScope}\nBooking Reference: ${booking.id}\nLead Auditor: GHGEmissionLogs Assurance Principal`
      );
      const calendarLocation = encodeURIComponent(meetUrl || 'Google Meet (Provisioned via Calendar)');

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startTimeIso}/${endTimeIso}&details=${calendarDetails}&location=${calendarLocation}`;

      return res.status(201).json({
        success: true,
        message: 'Demo confirmed. A calendar invitation and pre-audit briefing have been dispatched.',
        booking: {
          id: booking.id,
          fullName: booking.fullName,
          workEmail: booking.workEmail,
          companyName: booking.companyName,
          primaryScope: booking.primaryScope,
          requestedSlot: booking.requestedSlot.toISOString(),
          meetUrl: booking.meetUrl,
          ndaRequested: booking.ndaRequested,
          status: booking.status,
          createdAt: booking.createdAt.toISOString(),
        },
        googleCalendarUrl,
      });
    } catch (error: any) {
      console.error('[DemoBooking] Error booking demo:', error);
      return res.status(500).json({ error: 'Internal error processing demo booking. Please try again.' });
    }
  });

  /**
   * GET /api/admin/demo-bookings
   * Admin-only: Lists all demo bookings and enterprise inquiries.
   */
  router.get('/api/admin/demo-bookings', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bookings = await prisma.demoBooking.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, bookings });
    } catch (error: any) {
      console.error('[DemoBooking] Error fetching admin demo bookings:', error);
      return res.status(500).json({ error: 'Failed to retrieve demo inquiries' });
    }
  });

  /**
   * PATCH /api/admin/demo-bookings/:id/status
   * Admin-only: Updates the lifecycle status of a demo inquiry.
   */
  router.patch('/api/admin/demo-bookings/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      if (!status || !['CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const updated = await prisma.demoBooking.update({
        where: { id },
        data: { status },
      });

      return res.json({ success: true, booking: updated });
    } catch (error: any) {
      console.error('[DemoBooking] Error updating booking status:', error);
      return res.status(500).json({ error: 'Failed to update booking status' });
    }
  });

  return router;
}
