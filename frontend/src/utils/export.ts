import * as XLSX from "xlsx";

/**
 * Triggers a browser download of a Blob with the given filename.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports an array of flat objects to a CSV file and triggers download.
 * Handles quoting/escaping for commas, quotes, and newlines per RFC 4180.
 */
export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) {
    rows = [{}];
  }
  const headers = Object.keys(rows[0]);

  const escapeCell = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Exports an array of flat objects to an .xlsx file and triggers download.
 *
 * Note: uses the `xlsx` (SheetJS) package, which has a known unpatched
 * advisory (prototype pollution / ReDoS) when *parsing* untrusted files.
 * This usage only *writes* files from data we already control, so that
 * attack surface doesn't apply here — but worth knowing if this package
 * is ever used elsewhere to parse user-uploaded spreadsheets.
 */
export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
