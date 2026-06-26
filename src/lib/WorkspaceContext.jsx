import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WorkspaceSettings.list()
      .then(list => {
        setSettings(list[0] || { currency: "CZK", brand_color: "#C9A227" });
      })
      .catch(() => setSettings({ currency: "CZK", brand_color: "#C9A227" }))
      .finally(() => setLoading(false));
  }, []);

  const currency = settings?.currency || "CZK";

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return `0 ${currency}`;
    return `${Number(amount).toLocaleString()} ${currency}`;
  };

  return (
    <WorkspaceContext.Provider value={{ settings, loading, currency, formatAmount }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};