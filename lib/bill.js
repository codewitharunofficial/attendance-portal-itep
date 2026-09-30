// Bill maths for the IGNOU counselling remuneration bill (see assets/bill-template.xlsx).
// ASSUMPTIONS (confirm/adjust):
//  - 1 attendance entry = 1 class
//  - Counselling charge = hours x hourly rate for Major/Minor (rates set per counsellor in Admin)
//  - Conveyance = km x CONVEYANCE_PER_KM (env var, default 0)
// The template has exactly 12 session rows. If a counsellor logs more than 12 sessions in a
// month, the extra ones are folded into the last row (classes/amounts added in, a note added to
// the topic column) so the totals stay correct without altering the sheet's layout.
export const hoursBetween = (a, b) => {
  const [h1, m1] = a.split(":").map(Number), [h2, m2] = b.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
};
const r2 = (n) => +n.toFixed(2);
export const dmy = (d) => d.split("-").reverse().join("/");
export const MAX_BILL_ROWS = 12;

export function computeBill(user, entries) {
  const rate = { Major: user.ratePerHourMajor || 0, Minor: user.ratePerHourMinor || 0 };
  const perKm = +process.env.CONVEYANCE_PER_KM || 0;
  const calc = (e) => {
    const counselling = r2(hoursBetween(e.timeIn, e.timeOut) * rate[e.type]);
    const conveyance = r2((e.km || 0) * perKm);
    return { counselling, conveyance, total: r2(counselling + conveyance) };
  };

  const rows = entries.slice(0, MAX_BILL_ROWS).map((e, i) => {
    const c = calc(e);
    return { sno: i + 1, date: dmy(e.date), from: e.timeIn, to: e.timeOut, classes: 1, courseCode: e.courseCode,
      topic: e.topic || "", assigned: e.studentsAssigned ?? "", attended: e.studentsAttended ?? "", ...c };
  });

  const overflow = entries.slice(MAX_BILL_ROWS);
  if (overflow.length && rows.length) {
    const agg = overflow.reduce((s, e) => { const c = calc(e); return {
      classes: s.classes + 1, counselling: s.counselling + c.counselling, conveyance: s.conveyance + c.conveyance, total: s.total + c.total }; },
      { classes: 0, counselling: 0, conveyance: 0, total: 0 });
    const last = rows[rows.length - 1];
    last.classes += agg.classes;
    last.counselling = r2(last.counselling + agg.counselling);
    last.conveyance = r2(last.conveyance + agg.conveyance);
    last.total = r2(last.total + agg.total);
    last.topic = [last.topic, `(+${overflow.length} more session${overflow.length > 1 ? "s" : ""} combined)`].filter(Boolean).join(" ");
  }

  const sum = (k) => r2(rows.reduce((s, r) => s + r[k], 0));
  return { rows, overflow: overflow.length,
    totals: { classes: sum("classes"), counselling: sum("counselling"), conveyance: sum("conveyance"), total: sum("total") } };
}
