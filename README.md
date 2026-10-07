# Counsellor Attendance Portal (Next.js + MongoDB)

## Setup
1. `npm install`
2. `cp .env.example .env.local` and set MONGODB_URI, secrets, and your office lat/lng
   (keep the NEXT_PUBLIC_* values identical to OFFICE_* values)
3. `npm run seed` (creates admin@example.com / admin123 and counsellor@example.com / counsellor123)
4. `npm run dev` -> http://localhost:3000

## How it works
- Date is set by the server (IST). Counsellors enter course code, time in/out, Major/Minor.
- The browser sends GPS coordinates; the SERVER checks the 200 m radius (haversine) and rejects otherwise.
- On the 1st of every month `/api/cron/monthly` (Vercel Cron, see vercel.json) builds last month's Excel
  (Attendance sheet + Bill sheet) per counsellor and stores it in MongoDB.
- Counsellors can also download the current month any time from the dashboard.
- Bill logic lives in `lib/bill.js` (placeholder: hours x rate per Major/Minor). Replace with the real format.

## Not on Vercel?
Call the cron route from any scheduler: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/monthly`

## Admin
Create one admin document in MongoDB (see below), sign in, and you land on /admin:
add counsellors, edit names/rates, reset passwords, download any counsellor's Excel for a month,
or build a month's stored reports on demand.

Admin document (collection `users`):
{ name: "Office Admin", email: "you@org.com", role: "admin",
  passwordHash: "<bcrypt hash>", ratePerHourMajor: 0, ratePerHourMinor: 0 }
Generate the hash:  node -e "console.log(require('bcryptjs').hashSync('YourPassword',10))"

## Bill (IGNOU counselling remuneration format)
"Bill" sheet reproduces the IGNOU form: header, counsellor + programme, session table
(Date, Time From/To, No of Classes, Course Code, Unit/Topic, Students Assigned/Attended, Counselling charges,
Conveyance km + amount, Total), total in words (Indian numbering), certification, signatures, receipt block.
Assumptions in lib/bill.js: 1 entry = 1 class; charge = hours x Major/Minor hourly rate; conveyance = km x CONVEYANCE_PER_KM.

## Sign-up and approval
- `/signup` creates a PENDING account (counsellor or admin). It can't sign in until an admin approves it on /admin.
- Admins see a "Sign-up requests" panel: Approve (optionally setting rates) or Reject (deletes the request).
- Bootstrap: if the DB has no admin yet, a sign-up as admin is activated immediately so you're never locked out.
  Once you have your admin, this can't happen again. Existing users without a `status` field count as active.

## Official bill template
`assets/bill-template.xlsx` is the exact IGNOU bill format you provided — its layout, styles,
merges and totals formulas are never touched. `lib/report.js` only writes values into the
existing cells (counsellor name, programme, the 12 session rows, totals, total-in-words).
Replace `assets/bill-template.xlsx` with a new file (keeping cell positions listed in
`lib/report.js`) if the format ever changes.

The template has 12 session rows. If a counsellor logs more than 12 sessions in a month, the
extras are folded into the last row (amounts and class count added in, a note appended to the
topic) so totals stay correct without altering the sheet.

## Loading screen
`app/components/LoadingScreen.js` is the shared loading UI (a spinning ring around the brand
mark) used on the dashboard/admin while their first data loads, and as `app/loading.js` for
page-to-page navigation. Customize it by:
- passing `message` / `subtitle` props where it's used, or
- editing the colours once in `app/globals.css` (`--brand`, `--brand-2`, `--accent`) — the
  loading screen and the small inline `<Spinner/>` (used in busy buttons) both read from there.

## Approved Schedule (for finance)
`assets/schedule-template.docx` is the exact format you provided — title, table style, fonts and
borders are untouched. On Admin, each counsellor's row now has a **Schedule** button next to
**Excel**: it groups that month's attendance by date (up to two sessions a day, matching
Session-1/Session-2), fills in the counsellor's name, programme and the counselling period
(first to last date worked that month), and downloads a ready-to-submit .docx.
Logic lives in `lib/schedule.js` (grouping/formatting) and `lib/scheduleDoc.js` (filling the template).

Two assumptions worth checking:
- The title line became "Approved Schedule for {name}" — the sample's "(Zoology)" subject tag
  isn't something we track separately, so it's left out (the Programme line below already has it).
- If a counsellor logged more than 2 sessions on one date, only the first two show in
  Session-1/Session-2 (matching the template's two-session layout); the rest are still fully
  counted in the Excel bill.

## Multiple sessions per day
Counsellors can log up to 3 sessions a day (2 hours each, 6 hours max total) in one submission —
click "+ Add another session" on the dashboard to add session 2 or 3, each with its own course
code, times, Major/Minor, and bill details. The server (`app/api/attendance/route.js`) re-checks
all of this against what's already saved for today, including overlap checks, so the cap can't be
bypassed by submitting in several batches. Constants live in `lib/constants.js` if these numbers
ever change.

Same-date sessions are combined into a single row in both the Excel bill (`lib/bill.js`) and the
Approved Schedule (`lib/schedule.js`): classes, hours and amounts are summed, and course codes/
topics are joined with " / " when they differ across sessions.

## Conveyance is charged once per day
Travel is a single trip to the office, not one trip per session. "Kilometres travelled today" is
now a single field on the attendance form (not per session) — fill it once, regardless of how many
sessions you log that day. `lib/bill.js` also takes the **max** km across a date's sessions (not a
sum) as a safety net, so even older data or a second same-day submission can't double-charge conveyance.
