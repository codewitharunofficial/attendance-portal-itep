// Counselling-session rules, shared by the attendance API (enforcement) and the bill/schedule
// builders (grouping). One session = up to 2 hours; at most 3 sessions (6 hours) a day.
export const MAX_SESSION_HOURS = 2;
export const MAX_SESSIONS_PER_DAY = 3;
export const MAX_HOURS_PER_DAY = 6;
// assets/bill-template.xlsx ships with 12 blank session rows (13-24); lib/report.js grows or shrinks that block to fit.
export const TEMPLATE_DATA_ROWS = 12;
