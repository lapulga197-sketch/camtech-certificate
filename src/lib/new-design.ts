import { createDesign, type CertDesign, type DocType, type Org } from "@/lib/certificate-design";
import { DOC_TYPES } from "@/lib/doc-types";

/** A fresh design with the starting layout / theme / paper of a document type. */
export function newDesignFor(doc: DocType, org: Org, over: { layout?: CertDesign["layout"]; orientation?: CertDesign["orientation"] } = {}): CertDesign {
  const s = DOC_TYPES[doc].start;
  const d = createDesign(s.theme, over.orientation ?? s.orientation, org, { lang: s.lang, layout: over.layout ?? s.layout, doc, paper: s.paper });
  // Small cards read better without the large corner decorations.
  return doc === "student_card" ? { ...d, showDecor: false } : d;
}
