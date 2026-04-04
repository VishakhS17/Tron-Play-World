/**
 * Turn an uploaded spreadsheet into CSV text for existing import APIs.
 * - .csv / plain text: read as UTF-8 (strip BOM).
 * - .xlsx / .xls: first sheet only, via SheetJS (lazy-loaded).
 */
export async function fileToCsvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  const looksCsv =
    name.endsWith(".csv") ||
    type === "text/csv" ||
    type === "text/plain" ||
    type === "application/csv";

  if (looksCsv) {
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  }

  const looksExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.ms-excel";

  if (looksExcel) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const first = wb.SheetNames[0];
    if (!first) throw new Error("This spreadsheet has no sheets.");
    const sheet = wb.Sheets[first];
    return XLSX.utils.sheet_to_csv(sheet);
  }

  throw new Error("Unsupported file type. Use .csv, .xlsx, or .xls.");
}
