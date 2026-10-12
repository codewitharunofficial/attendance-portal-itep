import ExcelJS from "exceljs";
import path from "path";
import { computeBill, hoursBetween, dmy } from "./bill";
import { rupeesInWords } from "./words";
import { TEMPLATE_DATA_ROWS } from "./constants";

const TEMPLATE_PATH = path.join(process.cwd(), "assets", "bill-template.xlsx");
const SHEET_NAME = "Counsellor's Bill";
const FIRST_ROW = 13;                                  // first session row in the template
const LAST_TEMPLATE_ROW = FIRST_ROW + TEMPLATE_DATA_ROWS - 1; // 24
const TOTAL_ROW = 25;                                  // template's "Total" row
const WORDS_ROW = 27;                                  // template's "Total amount in words" row

// ExcelJS moves cell contents/styles when rows are inserted or removed, but NOT merge ranges.
// Everything merged below the session block (Total label, words, signatures...) has to be re-merged
// at its new position, otherwise the merges stay behind at the old rows.
function shiftMergesBelow(ws, afterRow, delta) {
  if (!delta) return;
  const moving = [];
  for (const range of ws.model.merges.slice()) {
    const [a, b] = range.split(":");
    const ma = /^([A-Z]+)(\d+)$/.exec(a), mb = /^([A-Z]+)(\d+)$/.exec(b);
    if (+ma[2] > afterRow) moving.push({ range, to: `${ma[1]}${+ma[2] + delta}:${mb[1]}${+mb[2] + delta}` });
  }
  // two phases: a range shifted into the place of one that hasn't moved yet would collide otherwise
  for (const m of moving) ws.unMergeCells(m.range);
  for (const m of moving) ws.mergeCells(m.to);
}

export async function buildWorkbook(user, month, entries) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH); // the official template: layout, styles and wording stay as provided
  const bs = wb.getWorksheet(SHEET_NAME);

  bs.getCell("A8").value = `Name of the Academic Counsellor:  ${user.name}`;
  bs.getCell("G8").value = `Programme:  ${user.programme || ""}`;

  const { groups, totals, rowCount } = computeBill(user, entries);

  // One row per session: grow or shrink the template's 12-row block to fit exactly.
  const delta = rowCount - TEMPLATE_DATA_ROWS;
  if (delta > 0) {
    bs.duplicateRow(LAST_TEMPLATE_ROW, delta, true); // copies row 24's borders/fonts for the new rows
    shiftMergesBelow(bs, LAST_TEMPLATE_ROW, delta);
  } else if (delta < 0) {
    bs.spliceRows(LAST_TEMPLATE_ROW + delta + 1, -delta);
    shiftMergesBelow(bs, LAST_TEMPLATE_ROW + delta, delta);
  }

  let r = FIRST_ROW, sno = 1;
  for (const g of groups) {
    const startR = r;
    for (const s of g.sessions) {
      bs.getCell(`C${r}`).value = s.from;
      bs.getCell(`D${r}`).value = s.to;
      bs.getCell(`E${r}`).value = s.classes;
      bs.getCell(`F${r}`).value = s.courseCode;
      bs.getCell(`G${r}`).value = s.topic;
      bs.getCell(`H${r}`).value = s.assigned;
      bs.getCell(`I${r}`).value = s.attended;
      bs.getCell(`J${r}`).value = s.counselling;
      r++;
    }
    const endR = r - 1;
    // once per date: S.No, Date, Conveyance, Total (merged down the date's session rows)
    bs.getCell(`A${startR}`).value = sno++;
    bs.getCell(`B${startR}`).value = g.date;
    bs.getCell(`K${startR}`).value = g.conveyance;
    bs.getCell(`L${startR}`).value = g.total;
    if (endR > startR) for (const col of ["A", "B", "K", "L"]) bs.mergeCells(`${col}${startR}:${col}${endR}`);
  }

  // The narrow Course Code column wraps (e.g. BTPA-\n044), so give session rows room like the real bills have.
  for (let i = FIRST_ROW; i < r; i++) bs.getRow(i).height = 30;

  // Totals row: SUM ignores the empty cells inside merged ranges, so each date counts once.
  const last = r - 1, totalRow = TOTAL_ROW + delta;
  bs.getCell(`J${totalRow}`).value = { formula: `SUM(J${FIRST_ROW}:J${last})`, result: totals.counselling };
  bs.getCell(`K${totalRow}`).value = { formula: `SUM(K${FIRST_ROW}:K${last})`, result: totals.conveyance };
  bs.getCell(`L${totalRow}`).value = { formula: `SUM(L${FIRST_ROW}:L${last})`, result: totals.total };
  bs.getCell(`A${WORDS_ROW + delta}`).value = `Total amount in words   ${rupeesInWords(totals.total)}`;

  // Raw attendance log as a second sheet (the counsellor's own record, not part of the official bill).
  const ws = wb.addWorksheet("Attendance Log");
  ws.addRow([`Counsellor: ${user.name}`, `Month: ${month}`]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Date", "Course Code", "Time In", "Time Out", "Hours", "Major / Minor", "Unit/Topic", "Students Assigned", "Students Attended", "Km"]).font = { bold: true };
  entries.forEach((e) => ws.addRow([dmy(e.date), e.courseCode, e.timeIn, e.timeOut, +hoursBetween(e.timeIn, e.timeOut).toFixed(2), e.type, e.topic || "", e.studentsAssigned ?? "", e.studentsAttended ?? "", e.km || 0]));
  ws.columns.forEach((c) => (c.width = 17));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
