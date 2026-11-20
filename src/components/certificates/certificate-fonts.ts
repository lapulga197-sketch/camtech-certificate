// Self-hosted fonts for the certificate studio (loaded only on the studio page,
// and available to the PNG/PDF export because they are same-origin).
//
// The Khmer families use the combined "<weight>.css" files, which carry a
// `unicode-range` per subset (khmer / latin). The separate "khmer-400.css" and
// "latin-400.css" files have NO unicode-range, so importing both made the Latin
// face shadow the Khmer one and Khmer text silently fell back to another font.
import "@fontsource/moul/400.css";
import "@fontsource/bokor/400.css";
import "@fontsource/koulen/400.css";
import "@fontsource/battambang/400.css";
import "@fontsource/battambang/700.css";
import "@fontsource/hanuman/400.css";
import "@fontsource/hanuman/700.css";
import "@fontsource/siemreap/400.css";
import "@fontsource/noto-serif-khmer/400.css";
import "@fontsource/noto-serif-khmer/700.css";
import "@fontsource/noto-sans-khmer/400.css";
import "@fontsource/noto-sans-khmer/700.css";
import "@fontsource/kantumruy-pro/400.css";
import "@fontsource/kantumruy-pro/700.css";
// Latin-only display fonts (no Khmer subset, so no conflict).
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/cinzel/latin-400.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/montserrat/latin-700.css";
