import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/users";
import { newId, query } from "@/lib/db";
import { allow } from "@/lib/security";
import { ALLOWED, MAX_UPLOAD, sniff, type AssetKind } from "@/lib/asset-files";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Admin file upload (logo, favicon, frames, guides…). Returns the new asset id. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !isAdmin(me.role)) return NextResponse.json({ error: "គ្មានសិទ្ធិ" }, { status: 403 });
  if (!(await allow(`up:${me.id}`, 60, 600))) return NextResponse.json({ error: "ផ្ទុកឡើងច្រើនដងពេក — សូមរង់ចាំបន្តិច" }, { status: 429 });
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_UPLOAD + 64 * 1024) return NextResponse.json({ error: "ឯកសារធំពេក (អតិបរមា 4MB)" }, { status: 413 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "ទម្រង់ឯកសារមិនត្រឹមត្រូវ" }, { status: 400 });
  }
  const file = fd.get("file");
  const kind = String(fd.get("kind") ?? "") as AssetKind;
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "សូមជ្រើសរើសឯកសារ" }, { status: 400 });
  if (!ALLOWED[kind]) return NextResponse.json({ error: "ប្រភេទមិនត្រឹមត្រូវ" }, { status: 400 });
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "ឯកសារធំពេក (អតិបរមា 4MB)" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !ALLOWED[kind].includes(mime)) {
    return NextResponse.json({ error: kind === "help" ? "ត្រូវប្រើឯកសារ PDF ប៉ុណ្ណោះ" : "ត្រូវប្រើរូបភាព PNG / JPG / WEBP / SVG (ហើយមិនមានកូដក្នុងរូប)" }, { status: 400 });
  }

  const meta: Record<string, unknown> = {};
  if (kind === "frame") {
    const docs = clean(fd.get("docs"), 200).split(",").filter((d) => /^[a-z_]+$/.test(d));
    const orient = clean(fd.get("orientation"), 12);
    meta.title = clean(fd.get("title"), 80) || file.name.replace(/\.[^.]+$/, "").slice(0, 80);
    meta.docs = docs;
    meta.orientation = ["landscape", "portrait", "both"].includes(orient) ? orient : "both";
  }
  if (kind === "pframe") {
    const num = (v: unknown, lo: number, hi: number, d: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
    };
    const h = clean(fd.get("hole"), 60).split(",").map((x) => num(x, 0, 45, 14));
    const shape = clean(fd.get("shape"), 10);
    meta.title = clean(fd.get("title"), 80) || file.name.replace(/\.[^.]+$/, "").slice(0, 80);
    meta.ar = Math.round(num(fd.get("ar"), 0.2, 5, 0.8) * 1000) / 1000;
    meta.hole = [h[0] ?? 14, h[1] ?? 14, h[2] ?? 14, h[3] ?? 14];
    meta.shape = ["rect", "rounded", "oval"].includes(shape) ? shape : "rect";
  }
  if (kind === "help") {
    meta.title = clean(fd.get("title"), 120) || file.name.replace(/\.[^.]+$/, "").slice(0, 120);
    meta.doc = clean(fd.get("doc"), 40).replace(/[^a-z_-]/g, "") || "general";
  }

  const id = newId();
  await query("INSERT INTO asset (id, kind, name, mime, size, data, meta, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7, (SELECT COALESCE(MAX(sort_order),0)+1 FROM asset WHERE kind = $2))", [
    id, kind, file.name.slice(0, 120), mime, buf.length, buf, JSON.stringify(meta),
  ]);
  return NextResponse.json({ id, url: `/api/asset/${id}`, mime, meta });
}
