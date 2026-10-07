// Bill maths for the IGNOU counselling remuneration bill (see assets/bill-template.xlsx).
// A counsellor can log up to MAX_SESSIONS_PER_DAY sessions on one date; all of them are
// combined into a SINGLE row for that date (classes, hours and amounts summed, course codes
// and topics joined) because the template has one row per date, not per session.
// ASSUMPTIONS (confirm/adjust):
//  - Counselling charge = hours x hourly rate for Major/Minor (rates set per counsellor in Admin)
//  - Conveyance = km x CONVEYANCE_PER_KM (env var, default 0)
// The template has exactly MAX_BILL_ROWS date rows. If a counsellor has sessions on more than
// that many distinct dates in a month, the extra dates are folded into the last row (so totals
// stay correct) without altering the sheet's layout.
import { hoursBetween, dmy } from "./time";
import { MAX_BILL_ROWS } from "./constants";
export { hoursBetween, dmy, MAX_BILL_ROWS };

const r2 = (n) => +n.toFixed(2);

export function computeBill(user, entries) {
  const rate = { Major: user.ratePerHourMajor || 0, Minor: user.ratePerHourMinor || 0 };
  const perKm = +process.env.CONVEYANCE_PER_KM || 0;

  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const dates = [...byDate.keys()].sort();

  const dayRows = dates.map((date, i) => {
    const sessions = byDate.get(date).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
    const codes = [...new Set(sessions.map((s) => s.courseCode))];
    const topics = [...new Set(sessions.map((s) => s.topic).filter(Boolean))];
    const assigned = sessions.reduce((s, e) => s + (e.studentsAssigned || 0), 0);
    const attended = sessions.reduce((s, e) => s + (e.studentsAttended || 0), 0);
    const counselling = r2(sessions.reduce((s, e) => s + hoursBetween(e.timeIn, e.timeOut) * rate[e.type], 0));
    // Conveyance is a once-a-day trip to the office, not per session — take the day's km once
    // (max across that date's sessions, so multiple sessions never multiply the travel charge).
    const km = Math.max(0, ...sessions.map((e) => e.km || 0));
    const conveyance = r2(km * perKm);
    return { sno: i + 1, date: dmy(date), from: sessions[0].timeIn, to: sessions[sessions.length - 1].timeOut,
      classes: sessions.length, courseCode: codes.join(" / "), topic: topics.join(" / "),
      assigned: assigned || "", attended: attended || "", counselling, conveyance, total: r2(counselling + conveyance) };
  });

  const rows = dayRows.slice(0, MAX_BILL_ROWS);
  const overflow = dayRows.slice(MAX_BILL_ROWS);
  if (overflow.length && rows.length) {
    const agg = overflow.reduce((s, r) => ({ classes: s.classes + r.classes, counselling: s.counselling + r.counselling,
      conveyance: s.conveyance + r.conveyance, total: s.total + r.total }), { classes: 0, counselling: 0, conveyance: 0, total: 0 });
    const last = rows[rows.length - 1];
    last.classes += agg.classes;
    last.counselling = r2(last.counselling + agg.counselling);
    last.conveyance = r2(last.conveyance + agg.conveyance);
    last.total = r2(last.total + agg.total);
    last.topic = [last.topic, `(+${overflow.length} more day${overflow.length > 1 ? "s" : ""} combined)`].filter(Boolean).join(" ");
  }

  const sum = (k) => r2(rows.reduce((s, r) => s + r[k], 0));
  return { rows, overflow: overflow.length,
    totals: { classes: sum("classes"), counselling: sum("counselling"), conveyance: sum("conveyance"), total: sum("total") } };
}
