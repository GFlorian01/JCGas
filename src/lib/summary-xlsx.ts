import ExcelJS from "exceljs";

export type SummaryRow = { date: string; client: string; total: number };

const money = '"S/" #,##0.00';
const long = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

// total_amount ya incluye IGV (18%); sin IGV = total / 1.18
export async function summaryXlsx(rows: SummaryRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resumen");
  ws.columns = [{ width: 30 }, { width: 38 }, { width: 18 }, { width: 18 }];
  ws.addTable({
    name: "Resumen", ref: "A1", style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: ["Fecha", "Cliente", "Total sin IGV", "Total con IGV"].map((name) => ({ name, filterButton: true })),
    rows: rows.map((r) => [long(r.date), r.client, r.total / 1.18, r.total]),
  });
  const last = rows.length + 1;
  ws.getColumn(3).numFmt = money;
  ws.getColumn(4).numFmt = money;
  // SUBTOTAL respeta los filtros que aplique el usuario en Excel
  const t = ws.getRow(last + 1);
  t.getCell(2).value = "Total";
  t.getCell(2).alignment = { horizontal: "right" };
  [3, 4].forEach((c) => {
    const col = c === 3 ? "C" : "D";
    t.getCell(c).value = { formula: `SUBTOTAL(109,${col}2:${col}${last})`, result: rows.reduce((a, r) => a + (c === 3 ? r.total / 1.18 : r.total), 0) };
    t.getCell(c).font = { bold: true, color: { argb: "FFFFFFFF" } };
    t.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC00000" } };
  });
  t.getCell(2).font = { bold: true };
  return wb.xlsx.writeBuffer();
}
