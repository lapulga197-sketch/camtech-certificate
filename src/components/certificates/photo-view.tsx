"use client";

import type { CSSProperties } from "react";
import type { DesignElement, PhotoCrop } from "@/lib/certificate-design";
import { isBuiltinFrame, ringOf } from "@/lib/photo-frames";

/**
 * The photo of a document: the picture cropped (Fill / Fit, zoom, focus point) inside
 * its window, optionally dressed with a built-in ring or an uploaded frame image.
 * Pure CSS so the editor, print and PNG/PDF export all draw the same thing.
 */
export function PhotoView({
  el, photo, crop, placeholder, cropping,
}: {
  el: DesignElement;
  photo?: string | null;
  crop: PhotoCrop;
  /** Editor only: caption shown while there is no photo. */
  placeholder?: string | null;
  /** Editor only: crop mode highlights the window. */
  cropping?: boolean;
}) {
  const pf = el.pframe;
  const uploaded = !!pf && !isBuiltinFrame(pf.id);
  const shape = uploaded ? pf!.shape ?? "rect" : el.shape ?? "rect";
  const radius = shape === "oval" || shape === "circle" ? "50%" : shape === "rounded" ? "12%" : 0;
  const ratio = uploaded ? pf!.ar ?? 0.75 : shape === "circle" ? 1 : el.ar ?? 0.75;
  const hole = uploaded ? pf!.hole ?? [14, 14, 14, 14] : [0, 0, 0, 0];
  const ring = pf && !uploaded ? ringOf(pf.id) : null;

  const win: CSSProperties = ring
    ? { position: "absolute", inset: ring.thickness, borderRadius: radius, overflow: "hidden", boxShadow: `0 0 0 1.5px ${ring.inner}, inset 0 0 6px rgba(0,0,0,0.25)` }
    : uploaded
      ? { position: "absolute", left: `${hole[0]}%`, top: `${hole[1]}%`, right: `${hole[2]}%`, bottom: `${hole[3]}%`, borderRadius: radius, overflow: "hidden" }
      : {
          position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", boxSizing: "border-box",
          border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? "#000"}` : undefined,
        };

  const fit = crop.fit === "fit";
  const origin = `${crop.px}% ${crop.py}%`;

  return (
    <div
      data-photo
      style={{
        position: "relative", aspectRatio: String(ratio), width: "100%", boxSizing: "border-box",
        ...(ring ? { borderRadius: radius, background: ring.bg, boxShadow: ring.glow ? `0 2px 10px ${ring.glow}` : undefined } : {}),
      }}
    >
      <div style={{ ...win, background: fit ? el.fitBg ?? "#ffffff" : "rgba(148,163,184,0.12)" }}>
        {photo ? (
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${photo})`, backgroundRepeat: "no-repeat",
              backgroundSize: fit ? "contain" : "cover", backgroundPosition: origin,
              transform: crop.zoom !== 1 ? `scale(${crop.zoom})` : undefined, transformOrigin: origin,
            }}
          />
        ) : placeholder ? (
          <div style={{ position: "absolute", inset: 0, border: "2px dashed #94a3b8", borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14, boxSizing: "border-box" }}>
            {placeholder}
          </div>
        ) : null}
        {cropping && <div style={{ position: "absolute", inset: 0, outline: "3px solid #ec4899", outlineOffset: -3, borderRadius: radius, pointerEvents: "none" }} />}
      </div>
      {uploaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/asset/${pf!.id}`} alt="" draggable={false} data-pframe
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }}
        />
      )}
    </div>
  );
}
