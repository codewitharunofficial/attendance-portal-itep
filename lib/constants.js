// Counselling-session rules, shared by the attendance API (enforcement) and the bill/schedule
// builders (grouping). One session = up to 2 hours; at most 3 sessions (6 hours) a day.
export const MAX_SESSION_HOURS = 2;
export const MAX_SESSIONS_PER_DAY = 3;
export const MAX_HOURS_PER_DAY = 6;
export const MAX_BILL_ROWS = 12; // rows 13-24 in assets/bill-template.xlsx (one row per DATE)
