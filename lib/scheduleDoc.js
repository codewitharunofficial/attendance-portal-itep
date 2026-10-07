import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const TEMPLATE_PATH = path.join(process.cwd(), "assets", "schedule-template.docx");

// Fills assets/schedule-template.docx (the exact format finance asked for) with real data.
// Only the {name}/{programme}/{periodFrom}/{periodTo} fields and the session-row loop are
// touched — everything else (title wording, table style, fonts, borders) comes from the template.
export async function buildScheduleDoc(user, rows, periodFrom, periodTo) {
  const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH, "binary"));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render({ name: user.name, programme: user.programme || "", periodFrom, periodTo, rows });
  return doc.getZip().generate({ type: "nodebuffer" });
}
