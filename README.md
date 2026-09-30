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
