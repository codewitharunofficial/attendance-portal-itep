// Shared time/date formatting used by both the bill (lib/bill.js) and the schedule doc (lib/schedule.js).
export const hoursBetween = (a, b) => {
  const [h1, m1] = a.split(":").map(Number), [h2, m2] = b.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
};
export const dmy = (d) => d.split("-").reverse().join("/");
export const to12h = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = String(((h + 11) % 12) + 1).padStart(2, "0");
  return `${h12}:${String(m).padStart(2, "0")}${period}`;
};
export const timeRange = (a, b) => `${to12h(a)} \u2013 ${to12h(b)}`;
