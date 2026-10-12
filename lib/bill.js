// Bill maths for the IGNOU counselling remuneration bill (see assets/bill-template.xlsx).
// Layout rule (matches the real submitted bills): every SESSION gets its own row with its own
// time, course code, topic, students and counselling charge. When a date has several sessions,
// the S.No, Date, Conveyance and Total cells are merged down those rows and shown ONCE per date
// (conveyance is a single trip to the office, so it is charged once a day, not once per session).
// ASSUMPTIONS (confirm/adjust):
//  - Counselling charge = hours x hourly rate for Major/Minor (rates set per counsellor in Admin)
//  - "No of Classes" = hours of that session (a 2h session = 2 classes), as on the real bills
//  - Conveyance = km x CONVEYANCE_PER_KM (env var, default 0); km is the day's max across its sessions
//  - Date total = that date's counselling charges + that date's single conveyance charge
import { hoursBetween, dmy } from "./time";
export { hoursBetween, dmy };

const r2 = (n) => +n.toFixed(2);

export function computeBill(user, entries) {
  const rate = { Major: user.ratePerHourMajor || 0, Minor: user.ratePerHourMinor || 0 };
  const perKm = +process.env.CONVEYANCE_PER_KM || 0;

  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }

  const groups = [...byDate.keys()].sort().map((date) => {
    const day = byDate.get(date).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
    const km = Math.max(0, ...day.map((e) => e.km || 0));
    const conveyance = r2(km * perKm);
    const sessions = day.map((e) => {
      const hrs = hoursBetween(e.timeIn, e.timeOut);
      return { from: e.timeIn, to: e.timeOut, classes: r2(hrs), courseCode: e.courseCode, topic: e.topic || "",
        assigned: e.studentsAssigned ?? "", attended: e.studentsAttended ?? "", counselling: r2(hrs * rate[e.type]) };
    });
    const counselling = r2(sessions.reduce((s, x) => s + x.counselling, 0));
    return { date: dmy(date), conveyance, sessions, total: r2(counselling + conveyance) };
  });

  const all = groups.flatMap((g) => g.sessions);
  return {
    groups,
    rowCount: all.length,
    totals: {
      classes: r2(all.reduce((s, x) => s + x.classes, 0)),
      counselling: r2(all.reduce((s, x) => s + x.counselling, 0)),
      conveyance: r2(groups.reduce((s, g) => s + g.conveyance, 0)),
      total: r2(groups.reduce((s, g) => s + g.total, 0)),
    },
  };
}
