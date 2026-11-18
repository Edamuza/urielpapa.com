# Discovery-call booking

The contact form ("Work together") shows free 15-minute slots from Uriel's Google Calendar. When a visitor picks one and sends the form, the site:

1. checks the slot is still free (Google Calendar free/busy),
2. creates the event in Uriel's calendar with a Google Meet link,
3. invites the visitor, so Google emails them the invite,
4. emails Uriel the message, the business answers and the booked time.

The code is in `src/lib/calendar.ts`, `src/pages/api/slots.ts` and `src/pages/api/contact.ts`. Hours, days, length, buffer and how far ahead people can book are in `BOOKING` in `src/config.ts` (Philippine time). Busy events in the calendar block their slots, plus a 15-minute buffer on each side.

Without the secrets below, the form hides the picker and asks for good call times instead.

## Set-up (once, about 10 minutes)

1. **Google Cloud project.** Use the one with the dashboard's sign-in client, or make one at console.cloud.google.com.
2. **Turn on the Google Calendar API**: APIs & Services → Library → Google Calendar API → Enable.
3. **OAuth consent screen**: add the scopes `calendar.events` and `calendar.freebusy`, and add your own Google account as a test user. Then click **Publish app** so the refresh token doesn't expire after 7 days. You'll see an "unverified app" warning when you sign in; it's your own app, so continue.
4. **OAuth client**: Credentials → Create credentials → OAuth client ID → **Desktop app**. Copy the client ID and secret.
5. **Refresh token**, on your own computer in this repository:

   ```sh
   GOOGLE_CALENDAR_CLIENT_ID=… GOOGLE_CALENDAR_CLIENT_SECRET=… node scripts/google-calendar-token.mjs
   ```

   Open the link it prints, sign in with the Google account whose calendar should take the bookings, and allow access. The terminal prints `GOOGLE_CALENDAR_REFRESH_TOKEN=…`.
6. **Secrets**: add `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` and `GOOGLE_CALENDAR_REFRESH_TOKEN` in Vercel (Settings → Environment Variables, Production and Preview) and in `/etc/urielpapa.com/env` on the VPS. `GOOGLE_CALENDAR_ID` defaults to `primary`; set it to book into another calendar.
7. Redeploy, open `/contact#work` and check that slots show. Book a test slot with a second email address and delete the event afterwards.
