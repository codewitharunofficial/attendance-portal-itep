// Turns a counsellor's attendance entries into rows for the "Approved Schedule" document
// that finance asks for alongside the bill (see assets/schedule-template.docx).
// Each row is one DATE. Up to the first two sessions that day fill Session-1 / Session-2
// (matching the template's two-session layout); a third session (allowed on attendance,
// capped at MAX_SESSIONS_PER_DAY) still counts fully in the Excel bill either way.
import { dmy, timeRange } from "./time";

export function buildScheduleRows(entries) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const dates = [...byDate.keys()].sort();
  const rows = dates.map((date, i) => {
    const sessions = byDate.get(date).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
    const codes = [...new Set(sessions.map((s) => s.courseCode))];
    return {
      no: i + 1,
      date: dmy(date),
      code: codes.join(" / "),
      s1: sessions[0] ? timeRange(sessions[0].timeIn, sessions[0].timeOut) : "",
      s2: sessions[1] ? timeRange(sessions[1].timeIn, sessions[1].timeOut) : "",
    };
  });
  return { rows, periodFrom: dates.length ? dmy(dates[0]) : "", periodTo: dates.length ? dmy(dates[dates.length - 1]) : "" };
}
