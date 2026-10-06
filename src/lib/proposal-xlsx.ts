import ExcelJS from "exceljs";

export type ProposalData = {
  code: string;
  client: string;
  location: string;
  date: string;
  serviceType: string;
  items: { description: string; quantity: number; price: number }[];
};

const blue = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8FAAD7" } } as const;
const thin = { style: "thin" } as const;
const box = { top: thin, left: thin, bottom: thin, right: thin };
const money = '"S/" #,##0.00;;';
const intro = "Nos es grato dirigirnos a ustedes, para saludarlos cordialmente y hacerle llegar nuestra propuesta económica por la realización de los siguientes trabajos:";

export async function proposalXlsx(d: ProposalData, logo: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Propuesta", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .5, right: .5, top: .6, bottom: .6, header: .3, footer: .3 } },
  });
  ws.columns = [{ width: 3 }, { width: 62 }, { width: 9 }, { width: 9 }, { width: 17 }, { width: 17 }];
  const line = (text: string, opts: Partial<ExcelJS.Style> = {}, height?: number) => {
    const row = ws.addRow([null, text]);
    ws.mergeCells(row.number, 2, row.number, 6);
    row.getCell(2).style = { alignment: { vertical: "middle", wrapText: true }, ...opts };
    if (height) row.height = height;
    return row;
  };

  const head = ws.addRow([null, "JC GAS"]);
  head.height = 56;
  head.getCell(2).style = { font: { bold: true, size: 12 }, alignment: { vertical: "middle", horizontal: "left", indent: 8 } };
  ws.addImage(wb.addImage({ buffer: logo, extension: "png" }), { tl: { col: 1.1, row: 0.1 }, ext: { width: 64, height: 64 } });
  line("PROPUESTA TÉCNICA ECONÓMICA", { font: { bold: true, size: 15 }, alignment: { vertical: "middle", horizontal: "center" } }, 30);

  line("", {}, 6);
  const date = new Date(d.date + "T00:00:00").toLocaleDateString("es-PE");
  [`Cliente:  ${d.client}`, `Dirección:  ${d.location}`, `Fecha:  ${date}`, `Tipo de servicio:  ${d.serviceType}`].forEach((t) => line(t, {}, 18));
  line("", {}, 8);
  line(intro, { alignment: { wrapText: true, vertical: "top", indent: 2 } }, 34);
  line("", {}, 8);
  line("PROPUESTA ECONÓMICA", { font: { bold: true } }, 20);

  const header = ws.addRow([null, "DESCRIPCIÓN", "CANT.", "UND", "PRECIO UNITARIO", "PARCIAL"]);
  header.height = 30;
  header.eachCell((c) => { c.fill = blue; c.border = box; c.font = { bold: true }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });

  const first = header.number + 1;
  d.items.forEach((i) => {
    const row = ws.addRow([null, i.description || "Sin descripción", i.quantity, 1, i.price, null]);
    row.getCell(6).value = { formula: `C${row.number}*E${row.number}`, result: i.quantity * i.price };
    row.height = Math.max(20, Math.ceil((i.description.length || 1) / 68) * 15 + 5);
    row.eachCell((c, n) => {
      c.border = box;
      c.alignment = { vertical: "middle", wrapText: n === 2, horizontal: n === 2 ? "left" : n < 5 ? "center" : "right" };
    });
    row.getCell(5).numFmt = money;
    row.getCell(6).numFmt = money;
  });
  const last = first + d.items.length - 1;

  const subtotal = d.items.reduce((a, i) => a + i.quantity * i.price, 0);
  const totals: [string, string, number][] = [
    ["TOTAL SIN IGV (S/.)", `SUM(F${first}:F${last})`, subtotal],
    ["IGV (S/.)", `F${last + 1}*0.18`, subtotal * 0.18],
    ["TOTAL CON IGV (S/.)", `F${last + 1}+F${last + 2}`, subtotal * 1.18],
  ];
  totals.forEach(([label, formula, result], n) => {
    const row = ws.addRow([null, label, null, null, null, { formula, result }]);
    ws.mergeCells(row.number, 2, row.number, 5);
    row.height = n === 2 ? 26 : 20;
    [2, 6].forEach((c) => {
      const cell = row.getCell(c);
      cell.fill = blue;
      cell.border = box;
      cell.font = { bold: n === 2 };
      cell.alignment = { vertical: "middle", horizontal: "right", indent: c === 2 ? 1 : 0 };
    });
    row.getCell(6).numFmt = money;
  });

  line("", {}, 24);
  line("Atte. JOSÉ CAJALEÓN", {}, 18);

  return wb.xlsx.writeBuffer();
}
