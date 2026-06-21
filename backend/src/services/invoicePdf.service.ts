import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const INVOICE_DIR = path.join(process.cwd(), "uploads", "invoices");

if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

interface InvoicePdfInput {
  invoiceNumber: string;
  issuedAt: Date;
  dueDate?: Date | null;
  amount: number;
  currency: string;
  caseNumber: string;
  patientName: string;
  serviceType: string;
  providerName?: string | null;
  priceIn: number;
  priceOut: number;
  discountPct: number;
  deductibleAmount: number;
  insurerName?: string | null;
  contractNumber?: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", EGP: "E£", USD: "$", GBP: "£" };

function money(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generates an invoice PDF on disk and returns its storage path + public URL.
 * Layout: letterhead, bill-to/case info, line item table, totals, footer.
 */
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ filePath: string; fileUrl: string }> {
  const fileName = `${input.invoiceNumber}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Letterhead
  doc.fontSize(20).fillColor("#0d3b3a").text("East Medical Assistance System", { continued: false });
  doc.fontSize(9).fillColor("#6b7680").text("Third Party Administrator — Medical Case Management");
  doc.moveDown(1.5);

  doc.strokeColor("#cbd3d8").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // Invoice header
  doc.fontSize(16).fillColor("#1a2229").text("INVOICE", { continued: false });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#3f4b54");
  doc.text(`Invoice number: ${input.invoiceNumber}`);
  doc.text(`Issue date: ${input.issuedAt.toLocaleDateString()}`);
  if (input.dueDate) doc.text(`Due date: ${input.dueDate.toLocaleDateString()}`);
  doc.moveDown(1);

  // Bill to / case info — two columns
  const colStartY = doc.y;
  doc.fontSize(10).fillColor("#1a2229").text("Bill to", 50, colStartY, { underline: true });
  doc.fontSize(10).fillColor("#3f4b54");
  doc.text(input.insurerName ?? "—", 50, doc.y);
  if (input.contractNumber) doc.text(`Contract: ${input.contractNumber}`, 50);

  doc.fontSize(10).fillColor("#1a2229").text("Case", 320, colStartY, { underline: true });
  doc.fontSize(10).fillColor("#3f4b54");
  doc.text(`Case number: ${input.caseNumber}`, 320);
  doc.text(`Patient: ${input.patientName}`, 320);

  doc.moveDown(2);

  // Line item table header
  const tableTop = doc.y;
  doc.fontSize(9).fillColor("#6b7680");
  doc.text("Description", 50, tableTop);
  doc.text("Price In", 280, tableTop, { width: 70, align: "right" });
  doc.text("Price Out", 350, tableTop, { width: 70, align: "right" });
  doc.text("Discount", 420, tableTop, { width: 60, align: "right" });
  doc.text("Net", 480, tableTop, { width: 65, align: "right" });

  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor("#cbd3d8").stroke();
  doc.moveDown(0.8);

  const rowY = doc.y;
  doc.fontSize(10).fillColor("#1a2229");
  doc.text(`${input.serviceType}${input.providerName ? ` — ${input.providerName}` : ""}`, 50, rowY, { width: 220 });
  doc.fontSize(9).fillColor("#3f4b54");
  doc.text(money(input.priceIn, input.currency), 280, rowY, { width: 70, align: "right" });
  doc.text(money(input.priceOut, input.currency), 350, rowY, { width: 70, align: "right" });
  doc.text(`${input.discountPct}%`, 420, rowY, { width: 60, align: "right" });
  doc.text(money(input.amount, input.currency), 480, rowY, { width: 65, align: "right" });

  doc.moveDown(2);
  doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor("#cbd3d8").stroke();
  doc.moveDown(0.5);

  if (input.deductibleAmount > 0) {
    doc.fontSize(9).fillColor("#6b7680").text("Deductible withheld", 350, doc.y, { width: 130, align: "right" });
    doc.text(money(input.deductibleAmount, input.currency), 480, doc.y - 11, { width: 65, align: "right" });
  }

  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#0d3b3a").text("Total payable", 350, doc.y, { width: 130, align: "right" });
  doc.text(money(input.amount, input.currency), 480, doc.y - 14, { width: 65, align: "right" });

  // Footer
  doc.fontSize(8).fillColor("#9aa5ab");
  doc.text(
    "This invoice was generated automatically by East Medical Assistance System.",
    50,
    750,
    { width: 495, align: "center" }
  );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return { filePath, fileUrl: `/uploads/invoices/${fileName}` };
}
