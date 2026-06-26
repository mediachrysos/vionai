import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext();

export function applyBrandColor(color) {
  if (!color) return;
  // Inject a <style> tag that overrides all hardcoded #C9A227 usages via CSS variables
  let styleEl = document.getElementById("brand-color-override");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "brand-color-override";
    document.head.appendChild(styleEl);
  }
  // Darken the color slightly for hover states
  styleEl.textContent = `
    :root { --brand: ${color}; }
    [style*="background-color: rgb"] { }
  `;
  // Patch all CSS variables used for the brand color
  document.documentElement.style.setProperty("--brand-color", color);
  const hsl = hexToHsl(color);
  if (hsl) {
    document.documentElement.style.setProperty("--primary", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
  }
  // Also patch inline usages via a dynamic stylesheet
  styleEl.textContent = `
    :root { --brand: ${color}; --brand-color: ${color}; }

    /* Backgrounds */
    .bg-\\[\\#C9A227\\] { background-color: ${color} !important; }
    .hover\\:bg-\\[\\#C9A227\\]:hover { background-color: ${color} !important; }
    .bg-\\[\\#A8841C\\] { background-color: ${color} !important; }
    .hover\\:bg-\\[\\#A8841C\\]:hover { background-color: ${color} !important; }
    .bg-\\[\\#C9A227\\]\\/10 { background-color: ${color}1a !important; }
    .bg-\\[\\#C9A227\\]\\/20 { background-color: ${color}33 !important; }
    .bg-\\[\\#C9A227\\]\\/30 { background-color: ${color}4d !important; }

    /* Text */
    .text-\\[\\#C9A227\\] { color: ${color} !important; }
    .hover\\:text-\\[\\#C9A227\\]:hover { color: ${color} !important; }

    /* Borders */
    .border-\\[\\#C9A227\\] { border-color: ${color} !important; }
    .border-t-\\[\\#C9A227\\] { border-top-color: ${color} !important; }
    .border-\\[\\#C9A227\\]\\/30 { border-color: ${color}4d !important; }
    .border-\\[\\#C9A227\\]\\/40 { border-color: ${color}66 !important; }
    .border-\\[\\#C9A227\\]\\/60 { border-color: ${color}99 !important; }
    .hover\\:border-\\[\\#C9A227\\]\\/40:hover { border-color: ${color}66 !important; }
    .hover\\:border-\\[\\#C9A227\\]\\/60:hover { border-color: ${color}99 !important; }
    .focus\\:border-\\[\\#C9A227\\]\\/40:focus { border-color: ${color}66 !important; }

    /* Gradients */
    .from-\\[\\#C9A227\\] { --tw-gradient-from: ${color} !important; }
    .to-\\[\\#A8841C\\] { --tw-gradient-to: ${color} !important; }
    .from-\\[\\#C9A227\\]\\/20 { --tw-gradient-from: ${color}33 !important; }

    /* Shadows/glow */
    .shadow-\\[0_0_20px_rgba\\(201\\,162\\,39\\,0\\.15\\)\\] { box-shadow: 0 0 20px ${color}26 !important; }
    .hover\\:shadow-\\[0_0_20px_rgba\\(201\\,162\\,39\\,0\\.15\\)\\]:hover { box-shadow: 0 0 20px ${color}26 !important; }

    /* Recharts SVG — chart lines and fills */
    .recharts-line-curve[stroke="#C9A227"],
    .recharts-area-curve[stroke="#C9A227"],
    path[stroke="#C9A227"],
    circle[stroke="#C9A227"],
    line[stroke="#C9A227"] { stroke: ${color} !important; }

    path[fill="#C9A227"],
    circle[fill="#C9A227"],
    rect[fill="#C9A227"] { fill: ${color} !important; }

    stop[stop-color="#C9A227"] { stop-color: ${color} !important; }
    stop[stop-color="rgba(201, 162, 39"] { stop-color: ${color} !important; }

    /* Progress bar */
    .bg-gradient-to-r.from-\\[\\#C9A227\\] { background: linear-gradient(to right, ${color}, ${color}cc) !important; }

    /* Ring/outline */
    .ring-\\[\\#C9A227\\] { --tw-ring-color: ${color} !important; }
    .outline-\\[\\#C9A227\\] { outline-color: ${color} !important; }

    /* Amber utility classes (used for badges, avatars, tags, sidebar active icon) */
    .text-amber-400, .text-amber-500, .text-amber-300, .text-amber-600 { color: ${color} !important; }
    .bg-amber-500\\/10, .bg-amber-400\\/10, .bg-amber-500\\/20 { background-color: ${color}1a !important; }
    .bg-amber-500\\/30 { background-color: ${color}4d !important; }
    .bg-amber-500 { background-color: ${color} !important; }
    .bg-amber-400 { background-color: ${color} !important; }
    .border-amber-500\\/30, .border-amber-400\\/30, .border-amber-700\\/30 { border-color: ${color}4d !important; }
    .border-amber-500\\/40, .border-amber-400\\/40 { border-color: ${color}66 !important; }
    .border-amber-500, .border-amber-400 { border-color: ${color} !important; }
    .bg-amber-950\\/10, .bg-amber-950\\/20, .bg-amber-950\\/30 { background-color: ${color}1a !important; }
    .bg-amber-700\\/20 { background-color: ${color}33 !important; }
    .hover\\:bg-amber-500\\/20:hover { background-color: ${color}33 !important; }
    .fill-amber-400, .fill-amber-500 { fill: ${color} !important; }
    .stroke-amber-400, .stroke-amber-500 { stroke: ${color} !important; }

    /* Primary button (uses hsl --primary which may not update inline) */
    button.bg-primary, a.bg-primary { background-color: ${color} !important; }
  `;
}

function hexToHsl(hex) {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const WorkspaceProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    base44.entities.WorkspaceSettings.list()
      .then(list => {
        const s = list[0] || { currency: "CZK", brand_color: "#C9A227" };
        setSettings(s);
        applyBrandColor(s.brand_color || "#C9A227");
      })
      .catch(() => {
        setSettings({ currency: "CZK", brand_color: "#C9A227" });
        applyBrandColor("#C9A227");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
    // Subscribe to changes so Settings page saves are reflected immediately
    const unsub = base44.entities.WorkspaceSettings.subscribe(() => loadSettings());
    return unsub;
  }, []);

  const currency = settings?.currency || "CZK";
  const brandColor = settings?.brand_color || "#C9A227";

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return `0 ${currency}`;
    return `${Number(amount).toLocaleString()} ${currency}`;
  };

  return (
    <WorkspaceContext.Provider value={{ settings, loading, currency, brandColor, formatAmount }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};