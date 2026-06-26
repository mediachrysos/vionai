import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext();

function applyBrandColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty("--brand-color", color);
  // Also update the CSS custom prop used by Tailwind primary
  const hsl = hexToHsl(color);
  if (hsl) document.documentElement.style.setProperty("--primary", hsl);
}

function hexToHsl(hex) {
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