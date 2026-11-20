"use client";

import "./certificate-fonts";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  MM_TO_PX, PT_TO_PX, fillVariables, fontCss, getTheme, pageSizePx,
  type CertDesign, type DesignElement, type Org, type Recipient, type Theme,
} from "@/lib/certificate-design";

export type EditorHooks = {
  selectedId: string | null;
  guides: { x: number | null; y: number | null };
  onElementPointerDown: (e: ReactPointerEvent<HTMLDivElement>, el: DesignElement) => void;
  onResizePointerDown: (e: ReactPointerEvent<HTMLDivElement>, el: DesignElement) => void;
};

function Decor({ theme, w, h }: { theme: Theme; w: number; h: number }) {
  const { primary: P, accent: A } = theme;
  // Fixed-size motifs are tuned for A4; shrink them on small pages (cards).
  const k = Math.min(1, Math.min(w, h) / 794);
  switch (theme.decor) {
    case "corners": {
      const corner = (
        <g fill="none">
          <path d="M0,70 L0,0 L70,0" stroke={A} strokeWidth={5} />
          <path d="M14,56 L14,14 L56,14" stroke={P} strokeWidth={2} />
          <circle cx={0} cy={0} r={9} fill={A} />
          <circle cx={78} cy={0} r={3.5} fill={A} />
          <circle cx={0} cy={78} r={3.5} fill={A} />
        </g>
      );
      const m = 22 * k;
      return (
        <g>
          <g transform={`translate(${m},${m}) scale(${k})`}>{corner}</g>
          <g transform={`translate(${w - m},${m}) scale(${-k},${k})`}>{corner}</g>
          <g transform={`translate(${m},${h - m}) scale(${k},${-k})`}>{corner}</g>
          <g transform={`translate(${w - m},${h - m}) scale(${-k},${-k})`}>{corner}</g>
        </g>
      );
    }
    case "bands": {
      const bw = w * 0.27;
      const bh = h * 0.32;
      const band = (
        <g>
          <path d={`M0,0 L${bw},0 C${bw * 0.78},${bh * 0.35} ${bw * 0.28},${bh * 0.68} 0,${bh} Z`} fill={P} />
          <path
            d={`M${bw},0 L${bw * 1.12},0 C${bw * 0.88},${bh * 0.4} ${bw * 0.32},${bh * 0.78} 0,${bh * 1.15} L0,${bh} C${bw * 0.28},${bh * 0.68} ${bw * 0.78},${bh * 0.35} ${bw},0 Z`}
            fill={A}
          />
          <path d={`M0,0 L${bw * 0.55},0 C${bw * 0.42},${bh * 0.22} ${bw * 0.16},${bh * 0.42} 0,${bh * 0.6} Z`} fill="#ffffff" opacity={0.12} />
        </g>
      );
      return (
        <g>
          {band}
          <g transform={`rotate(180 ${w / 2} ${h / 2})`}>{band}</g>
        </g>
      );
    }
    case "waves":
      return (
        <g>
          <path d={`M0,${h * 0.9} C${w * 0.25},${h * 0.8} ${w * 0.5},${h * 1.0} ${w * 0.75},${h * 0.9} S${w},${h * 0.86} ${w},${h * 0.88} V${h} H0 Z`} fill={A} opacity={0.55} />
          <path d={`M0,${h * 0.94} C${w * 0.25},${h * 0.86} ${w * 0.55},${h * 1.02} ${w * 0.8},${h * 0.94} S${w},${h * 0.92} ${w},${h * 0.93} V${h} H0 Z`} fill={P} />
          <circle cx={0} cy={0} r={Math.min(w, h) * 0.17} fill={A} opacity={0.22} />
          <circle cx={0} cy={0} r={Math.min(w, h) * 0.11} fill={P} opacity={0.35} />
          <circle cx={w} cy={0} r={Math.min(w, h) * 0.08} fill={A} opacity={0.18} />
        </g>
      );
    case "frame": {
      const i = 15 * MM_TO_PX * 0.55 * k;
      const sq = 14 * k;
      return (
        <g fill="none">
          <rect x={i} y={i} width={w - i * 2} height={h - i * 2} stroke={A} strokeWidth={1.5} />
          {[
            [i, i], [w - i, i], [i, h - i], [w - i, h - i],
          ].map(([cx, cy], idx) => (
            <rect key={idx} x={cx - sq / 2} y={cy - sq / 2} width={sq} height={sq} fill={A} transform={`rotate(45 ${cx} ${cy})`} />
          ))}
        </g>
      );
    }
    case "geometric":
      return (
        <g>
          <polygon points={`${w},0 ${w * 0.7},0 ${w},${h * 0.34}`} fill={P} />
          <polygon points={`${w},0 ${w * 0.84},0 ${w},${h * 0.18}`} fill={A} />
          <polygon points={`0,${h} ${w * 0.3},${h} 0,${h * 0.66}`} fill={P} />
          <polygon points={`0,${h} ${w * 0.16},${h} 0,${h * 0.82}`} fill={A} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Decorative frame: a tinted margin, a band of repeated lotus-like motifs and
 * thin inner rules (a simple stand-in for the engraved borders of printed
 * certificates; upload your own border image as the background for the real thing).
 */
function OrnateBorder({ design }: { design: CertDesign }) {
  const b = design.border;
  const { w, h } = pageSizePx(design);
  const inset = b.insetMm * MM_TO_PX;
  const band = Math.max(10, b.widthMm * 4 * MM_TO_PX);
  const s = band;
  const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
  const ring = (a: number, bb: number, c: number, d: number, e: number, f: number, g: number, hh: number) =>
    `M${a},${bb} H${c} V${d} H${a} Z M${e},${f} H${g} V${hh} H${e} Z`;
  const bx0 = x0 + band, by0 = y0 + band, bx1 = x1 - band, by1 = y1 - band;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <pattern id="cert-orn" width={s} height={s} patternUnits="userSpaceOnUse">
          <rect width={s} height={s} fill="#ffffff" fillOpacity={0.55} />
          <g fill="none" stroke={b.color2} strokeWidth={Math.max(0.8, s / 22)}>
            <path d={`M0,${s / 2} Q${s / 4},${s / 6} ${s / 2},${s / 2} T${s},${s / 2}`} />
            <path d={`M0,${s / 2} Q${s / 4},${s * 0.83} ${s / 2},${s / 2} T${s},${s / 2}`} />
            <circle cx={s / 2} cy={s / 2} r={s / 7} fill={b.color2} fillOpacity={0.35} />
          </g>
          <path d={`M${s / 2},${s * 0.04} L${s * 0.6},${s * 0.2} L${s / 2},${s * 0.3} L${s * 0.4},${s * 0.2} Z M${s / 2},${s * 0.96} L${s * 0.6},${s * 0.8} L${s / 2},${s * 0.7} L${s * 0.4},${s * 0.8} Z`} fill={b.color2} fillOpacity={0.5} />
        </pattern>
      </defs>
      {/* tinted margin outside the frame */}
      <path d={ring(0, 0, w, h, x0, y0, x1, y1)} fillRule="evenodd" fill={b.color} />
      {/* band with the repeated motif */}
      <path d={ring(x0, y0, x1, y1, bx0, by0, bx1, by1)} fillRule="evenodd" fill={b.color} />
      <path d={ring(x0, y0, x1, y1, bx0, by0, bx1, by1)} fillRule="evenodd" fill="url(#cert-orn)" />
      {/* thin rules */}
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="none" stroke={b.color2} strokeWidth={1.4} />
      <rect x={bx0} y={by0} width={bx1 - bx0} height={by1 - by0} fill="none" stroke={b.color2} strokeWidth={1.4} />
      <rect x={bx0 + 4} y={by0 + 4} width={bx1 - bx0 - 8} height={by1 - by0 - 8} fill="none" stroke={b.color2} strokeWidth={0.7} opacity={0.6} />
    </svg>
  );
}

function Border({ design }: { design: CertDesign }) {
  const b = design.border;
  if (b.style === "none") return null;
  const inset = b.insetMm * MM_TO_PX;
  const bw = Math.max(0.5, b.widthMm * MM_TO_PX);
  const base: CSSProperties = { position: "absolute", pointerEvents: "none", boxSizing: "border-box" };
  if (b.style === "ornate") return <OrnateBorder design={design} />;
  if (b.style === "single") return <div style={{ ...base, inset, border: `${bw}px solid ${b.color}` }} />;
  if (b.style === "double") return <div style={{ ...base, inset, border: `${bw * 3.2}px double ${b.color}` }} />;
  // thick-thin
  return (
    <>
      <div style={{ ...base, inset, border: `${bw * 2}px solid ${b.color}` }} />
      <div style={{ ...base, inset: inset + bw * 4.5, border: `${Math.max(0.8, bw * 0.5)}px solid ${b.color2}` }} />
    </>
  );
}

function ElementView({
  el, design, recipient, org, editor,
}: {
  el: DesignElement; design: CertDesign; recipient: Recipient | null; org: Org; editor?: EditorHooks;
}) {
  const selected = editor?.selectedId === el.id;
  const wrap: CSSProperties = {
    position: "absolute",
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    opacity: el.opacity ?? 1,
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    transformOrigin: "center",
    cursor: editor ? "move" : undefined,
    outline: selected ? "2px solid #2563eb" : undefined,
    outlineOffset: 3,
    touchAction: editor ? "none" : undefined,
    userSelect: "none",
  };

  let inner: React.ReactNode = null;
  const radius = el.shape === "circle" ? "50%" : el.shape === "rounded" ? "12%" : 0;
  const ratio = el.shape === "circle" ? 1 : el.ar;
  const frame: CSSProperties = {
    borderRadius: radius,
    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? "#000"}` : undefined,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  if (el.type === "text") {
    const content = fillVariables(el.text ?? "", recipient, org, design);
    const parts = content.split(/\[\[|\]\]/);
    const body: React.ReactNode =
      parts.length > 1
        ? parts.map((t, i) => (i % 2 === 1 ? <span key={i} style={{ fontWeight: 700, color: el.hlColor ?? el.color }}>{t}</span> : <span key={i}>{t}</span>))
        : content;
    inner = (
      <div
        style={{
          fontFamily: fontCss(el.fontFamily),
          fontSize: (el.fontSize ?? 14) * PT_TO_PX,
          color: el.color ?? "#000",
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          textAlign: el.align ?? "center",
          lineHeight: el.lineHeight ?? 1.4,
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
          whiteSpace: "pre-wrap",
          minHeight: "1em",
        }}
      >
        {content ? body : editor ? " " : ""}
      </div>
    );
  } else if (el.type === "line") {
    inner = <div style={{ height: el.thickness ?? 1, background: el.color ?? "#000" }} />;
  } else if (el.type === "image") {
    inner = el.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={el.src} alt="" draggable={false} style={{ display: "block", width: "100%", aspectRatio: String(ratio ?? 1), objectFit: "contain", ...frame }} />
    ) : editor ? (
      <div style={{ aspectRatio: String(ratio ?? 1), border: "2px dashed #94a3b8", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 12, background: "rgba(148,163,184,0.10)", textAlign: "center", ...frame }}>
        {el.label ?? "រូបភាព"}
      </div>
    ) : null;
  } else if (el.type === "photo") {
    if (recipient?.photo) {
      inner = (
        <div style={{ aspectRatio: String(ratio ?? 0.75), backgroundImage: `url(${recipient.photo})`, backgroundSize: "cover", backgroundPosition: "center top", ...frame }} />
      );
    } else if (editor) {
      inner = (
        <div style={{ aspectRatio: String(ratio ?? 0.75), border: "2px dashed #94a3b8", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14, background: "rgba(148,163,184,0.12)", ...frame }}>
          រូបថត
        </div>
      );
    }
  } else if (el.type === "qr") {
    if (recipient?.qr) {
      // eslint-disable-next-line @next/next/no-img-element
      inner = <img src={recipient.qr} alt="" draggable={false} style={{ display: "block", width: "100%", aspectRatio: "1", ...frame }} />;
    } else if (editor) {
      inner = (
        <div style={{ aspectRatio: "1", border: "2px dashed #94a3b8", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14, background: "rgba(148,163,184,0.12)" }}>
          QR
        </div>
      );
    }
  }

  if (!inner) return null;

  return (
    <div
      data-el-id={el.id}
      style={wrap}
      onPointerDown={editor ? (e) => editor.onElementPointerDown(e, el) : undefined}
    >
      {inner}
      {editor && selected && (
        <div
          data-resize
          onPointerDown={(e) => editor.onResizePointerDown(e, el)}
          style={{
            position: "absolute", right: -9, top: "50%", width: 14, height: 14, marginTop: -7,
            background: "#2563eb", border: "2px solid #fff", borderRadius: 3, cursor: "ew-resize", touchAction: "none",
          }}
        />
      )}
    </div>
  );
}

/**
 * One certificate page at its real pixel size (96 dpi). The studio shows it
 * scaled with CSS; exports render it unscaled.
 */
export function CertificateCanvas({
  design, recipient, org, editor,
}: {
  design: CertDesign; recipient: Recipient | null; org: Org; editor?: EditorHooks;
}) {
  const { w, h } = pageSizePx(design);
  const theme = getTheme(design.themeId);
  const wm = design.watermark;

  return (
    <div
      data-cert-page
      style={{
        position: "relative", width: w, height: h, overflow: "hidden", boxSizing: "border-box",
        backgroundColor: design.bgColor,
        backgroundImage: !design.bgImage && design.showDecor ? theme.bgGradient : undefined,
        color: "#000",
      }}
    >
      {design.bgImage && (
        <div
          style={{
            position: "absolute", inset: 0, opacity: design.bgImageOpacity,
            backgroundImage: `url(${design.bgImage})`,
            backgroundSize: design.bgFit === "stretch" ? "100% 100%" : design.bgFit,
            backgroundPosition: "center", backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {design.showDecor && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Decor theme={theme} w={w} h={h} />
        </svg>
      )}
      {wm.enabled && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", opacity: wm.opacity, overflow: "hidden",
          }}
        >
          {wm.type === "image" && wm.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wm.image} alt="" draggable={false} style={{ width: `${wm.sizePct}%`, transform: `rotate(${wm.rotate}deg)`, objectFit: "contain" }} />
          ) : (
            <div
              style={{
                fontFamily: fontCss(wm.fontFamily), color: wm.color, fontSize: (w * wm.sizePct) / 100,
                transform: `rotate(${wm.rotate}deg)`, whiteSpace: "nowrap", lineHeight: 1,
              }}
            >
              {fillVariables(wm.text, recipient, org, design)}
            </div>
          )}
        </div>
      )}
      <Border design={design} />
      {design.elements.map((el) => (
        <ElementView key={el.id} el={el} design={design} recipient={recipient} org={org} editor={editor} />
      ))}
      {editor && editor.guides.x !== null && (
        <div style={{ position: "absolute", left: `${editor.guides.x}%`, top: 0, bottom: 0, width: 0, borderLeft: "1.5px dashed #ec4899", pointerEvents: "none" }} />
      )}
      {editor && editor.guides.y !== null && (
        <div style={{ position: "absolute", top: `${editor.guides.y}%`, left: 0, right: 0, height: 0, borderTop: "1.5px dashed #ec4899", pointerEvents: "none" }} />
      )}
    </div>
  );
}
