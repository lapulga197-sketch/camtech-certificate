import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const row = await queryOne<{ kind: string; mime: string; data: Buffer; name: string }>("SELECT kind, mime, data, name FROM asset WHERE id = $1", [id]);
  if (!row) return new NextResponse("Not found", { status: 404 });

  // User guides are for signed-in users only; brand images and frames are public (the sign-in page shows the logo).
  if (row.kind === "help") {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  }

  const headers: Record<string, string> = {
    "Content-Type": row.mime,
    "Content-Length": String(row.data.length),
    "X-Content-Type-Options": "nosniff",
    // ids never change content, so the file can be cached for a year
    "Cache-Control": row.kind === "help" ? "private, max-age=3600" : "public, max-age=31536000, immutable",
  };
  if (row.mime === "image/svg+xml") headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";
  const asciiName = row.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
  const url = new URL(req.url);
  headers["Content-Disposition"] = `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${asciiName}"`;
  return new NextResponse(new Uint8Array(row.data), { headers });
}
