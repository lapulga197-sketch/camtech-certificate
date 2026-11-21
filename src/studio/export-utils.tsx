import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { CertificateCanvas } from "@/components/certificates/certificate-canvas";
import { pageSizeMm, pageSizePx, type CertDesign, type Org, type Recipient } from "@/lib/certificate-design";
import { downloadBlob, safeFileName } from "./image-utils";

async function ensureFonts(design: CertDesign) {
  const keys = new Set<string>();
  for (const e of design.elements) if (e.fontFamily) keys.add(e.fontFamily);
  if (design.watermark.enabled) keys.add(design.watermark.fontFamily);
  const sample = "កខគឃ ក្រុម Aa 0123";
  await Promise.all(
    [...keys].flatMap((k) => [
      document.fonts.load(`16px "${k}"`, sample),
      document.fonts.load(`bold 16px "${k}"`, sample),
    ]).map((p) => p.catch(() => undefined))
  );
  await document.fonts.ready;
}

async function imagesReady(root: HTMLElement) {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
  // Background images are CSS — give the browser a frame to fetch/decode them.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/** Renders one certificate off-screen at full size and returns it as a data URL. */
export async function renderCertificate(
  design: CertDesign,
  recipient: Recipient | null,
  org: Org,
  opts: { format: "png" | "jpeg"; pixelRatio: number; quality?: number }
): Promise<string> {
  const { toPng, toJpeg } = await import("html-to-image");
  const { w, h } = pageSizePx(design);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-30000px;top:0;pointer-events:none;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<CertificateCanvas design={design} recipient={recipient} org={org} />));
    await ensureFonts(design);
    const node = host.firstElementChild as HTMLElement;
    await imagesReady(node);
    const options = { pixelRatio: opts.pixelRatio, width: w, height: h, cacheBust: false, backgroundColor: design.bgColor };
    // First pass warms font/image embedding; the second is the one we keep.
    await toPng(node, { ...options, pixelRatio: 0.2 }).catch(() => undefined);
    return opts.format === "png" ? await toPng(node, options) : await toJpeg(node, { ...options, quality: opts.quality ?? 0.92 });
  } finally {
    root.unmount();
    host.remove();
  }
}

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(",");
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Lets the browser paint / handle clicks between heavy renders (keeps big batches responsive). */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

export function recipientFileName(r: Recipient | null, index: number): string {
  return `${String(index + 1).padStart(2, "0")}-${safeFileName(r?.name || "document")}`;
}

/** How many cards of this design fit on one A4 sheet (portrait), with 8mm margins and 3mm gaps. */
export function sheetGrid(card: { w: number; h: number }) {
  const A4 = { w: 210, h: 297 };
  const margin = 8;
  const gap = 3;
  const cols = Math.max(1, Math.floor((A4.w - 2 * margin + gap) / (card.w + gap)));
  const rows = Math.max(1, Math.floor((A4.h - 2 * margin + gap) / (card.h + gap)));
  const usedW = cols * card.w + (cols - 1) * gap;
  const usedH = rows * card.h + (rows - 1) * gap;
  const x0 = (A4.w - usedW) / 2;
  const y0 = (A4.h - usedH) / 2;
  return { A4, cols, rows, perPage: cols * rows, gap, x0, y0, cell: (i: number) => ({ x: x0 + (i % cols) * (card.w + gap), y: y0 + Math.floor((i % (cols * rows)) / cols) * (card.h + gap) }) };
}

export async function exportPng(design: CertDesign, recipient: Recipient | null, org: Org, pixelRatio: number, index: number) {
  const url = await renderCertificate(design, recipient, org, { format: "png", pixelRatio });
  downloadBlob(dataUrlToBlob(url), `${recipientFileName(recipient, index)}.png`);
}

export async function exportZip(
  design: CertDesign, recipients: Recipient[], org: Org, pixelRatio: number, onProgress: (done: number, total: number) => void, zipName = "documents"
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let i = 0; i < recipients.length; i++) {
    onProgress(i, recipients.length);
    await breathe();
    const url = await renderCertificate(design, recipients[i], org, { format: "png", pixelRatio });
    zip.file(`${recipientFileName(recipients[i], i)}.png`, dataUrlToBlob(url));
  }
  onProgress(recipients.length, recipients.length);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safeFileName(zipName)}.zip`);
}

export async function exportPdf(
  design: CertDesign, recipients: Recipient[], org: Org, pixelRatio: number, fileName: string,
  onProgress: (done: number, total: number) => void
) {
  const { jsPDF } = await import("jspdf");
  const mm = pageSizeMm(design);
  const orientation = mm.w > mm.h ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: [mm.w, mm.h], compress: true });
  for (let i = 0; i < recipients.length; i++) {
    onProgress(i, recipients.length);
    await breathe();
    const url = await renderCertificate(design, recipients[i], org, { format: "jpeg", pixelRatio, quality: 0.93 });
    if (i > 0) pdf.addPage([mm.w, mm.h], orientation);
    pdf.addImage(url, "JPEG", 0, 0, mm.w, mm.h, undefined, "FAST");
  }
  onProgress(recipients.length, recipients.length);
  downloadBlob(pdf.output("blob"), `${safeFileName(fileName)}.pdf`);
}

/** Several cards per A4 page (with thin cut marks) as one PDF. */
export async function exportCardSheetPdf(
  design: CertDesign, recipients: Recipient[], org: Org, pixelRatio: number, fileName: string,
  onProgress: (done: number, total: number) => void
) {
  const { jsPDF } = await import("jspdf");
  const mm = pageSizeMm(design);
  const g = sheetGrid(mm);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [g.A4.w, g.A4.h], compress: true });
  for (let i = 0; i < recipients.length; i++) {
    onProgress(i, recipients.length);
    await breathe();
    const url = await renderCertificate(design, recipients[i], org, { format: "jpeg", pixelRatio, quality: 0.93 });
    if (i > 0 && i % g.perPage === 0) pdf.addPage([g.A4.w, g.A4.h], "portrait");
    const c = g.cell(i);
    pdf.addImage(url, "JPEG", c.x, c.y, mm.w, mm.h, undefined, "FAST");
    pdf.setDrawColor(170);
    pdf.setLineWidth(0.1);
    pdf.rect(c.x, c.y, mm.w, mm.h);
  }
  onProgress(recipients.length, recipients.length);
  downloadBlob(pdf.output("blob"), `${safeFileName(fileName)}.pdf`);
}
