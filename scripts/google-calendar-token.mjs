/* eslint-disable no-console -- a one-off command-line helper */
// Makes the refresh token the contact form uses to book discovery calls in
// Uriel's Google Calendar (src/lib/calendar.ts). Run it once on your own computer:
//
//   GOOGLE_CALENDAR_CLIENT_ID=… GOOGLE_CALENDAR_CLIENT_SECRET=… node scripts/google-calendar-token.mjs
//
// It opens a sign-in link, waits for Google to send you back to
// http://127.0.0.1:53682/callback, and prints GOOGLE_CALENDAR_REFRESH_TOKEN.
// Use a "Desktop app" OAuth client, which accepts this loopback address.
import { createServer } from "node:http";

const id = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const secret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
if (!id || !secret) {
  console.error(
    "Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET first."
  );
  process.exit(1);
}

const port = 53682;
const redirect = `http://127.0.0.1:${port}/callback`;
const scopes = [
  // Create the call events (with Meet links and invites).
  "https://www.googleapis.com/auth/calendar.events",
  // Read busy times only, to offer free slots.
  "https://www.googleapis.com/auth/calendar.freebusy",
];
const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
auth.search = new URLSearchParams({
  client_id: id,
  redirect_uri: redirect,
  response_type: "code",
  scope: scopes.join(" "),
  access_type: "offline",
  prompt: "consent",
}).toString();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirect);
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  const code = url.searchParams.get("code");
  if (!code) {
    res.end("No code in the reply. Close this tab and try again.");
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.end("Google sent no refresh token. See the terminal.");
    console.error(data);
  } else {
    res.end("Done. You can close this tab and go back to the terminal.");
    console.log(`\nGOOGLE_CALENDAR_REFRESH_TOKEN=${data.refresh_token}\n`);
    console.log(
      "Add it, with the client ID and secret, to Vercel and /etc/urielpapa.com/env."
    );
  }
  server.close();
});

server.listen(port, "127.0.0.1", () => {
  console.log("Open this link, sign in with your Google account and allow access:\n");
  console.log(auth.toString());
});
