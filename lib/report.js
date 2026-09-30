import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { computeBill, hoursBetween, dmy, MAX_BILL_ROWS } from "./bill";
import { rupeesInWords } from "./words";

const TEMPLATE_PATH = path.join(process.cwd(), "assets", "bill-template.xlsx");
const FIRST_ROW = 13; // first session row in the template
const SHEET_NAME = "Counsellor's Bill";

export async function buildWorkbook(user, month, entries) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH); // loads the official template's layout, styles and formulas untouched
  const bs = wb.getWorksheet(SHEET_NAME);

  bs.getCell("A8").value = `Name of the Academic Counsellor:  ${user.name}`;
  bs.getCell("G8").value = `Programme:  ${user.programme || ""}`;

  const bill = computeBill(user, entries);
  for (let i = 0; i < MAX_BILL_ROWS; i++) {
    const r = FIRST_ROW + i, row = bill.rows[i];
    const put = (col, val) => (bs.getCell(`${col}${r}`).value = row ? val : "");
    put("A", row?.sno); put("B", row?.date); put("C", row?.from); put("D", row?.to);
    put("E", row?.classes); put("F", row?.courseCode); put("G", row?.topic);
    put("H", row?.assigned); put("I", row?.attended);
    put("J", row?.counselling); put("K", row?.conveyance); put("L", row?.total);
  }
  // Totals row already holds =SUM(...) formulas; refresh the cached result so viewers
  // that don't auto-recalculate (some previewers) still show the right numbers.
  bs.getCell("J25").value = { formula: "SUM(J13:J24)", result: bill.totals.counselling };
  bs.getCell("K25").value = { formula: "SUM(K13:K24)", result: bill.totals.conveyance };
  bs.getCell("L25").value = { formula: "SUM(L13:L24)", result: bill.totals.total };

  bs.getCell("A27").value = `Total amount in words   ${rupeesInWords(bill.totals.total)}`;

  // Raw attendance log, kept as a second sheet for the counsellor's own records (not part of the official bill).
  const ws = wb.addWorksheet("Attendance Log");
  ws.addRow([`Counsellor: ${user.name}`, `Month: ${month}`]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Date", "Course Code", "Time In", "Time Out", "Hours", "Major / Minor", "Unit/Topic", "Students Assigned", "Students Attended", "Km"]).font = { bold: true };
  entries.forEach((e) => ws.addRow([dmy(e.date), e.courseCode, e.timeIn, e.timeOut, +hoursBetween(e.timeIn, e.timeOut).toFixed(2), e.type, e.topic || "", e.studentsAssigned ?? "", e.studentsAttended ?? "", e.km || 0]));
  ws.columns.forEach((c) => (c.width = 17));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
