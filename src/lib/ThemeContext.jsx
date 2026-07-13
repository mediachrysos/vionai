import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const STORAGE_KEY = "vionai_theme";
const SCHEDULE_KEY = "vionai_theme_schedule";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "light"; // default
  });

  const [schedule, setSchedule] = useState(() => {
    try {
      const s = localStorage.getItem(SCHEDULE_KEY);
      return s ? JSON.parse(s) : { enabled: false, lightFrom: "07:00", darkFrom: "20:00" };
    } catch {
      return { enabled: false, lightFrom: "07:00", darkFrom: "20:00" };
    }
  });

  // Apply theme to <html> and save
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-mode");
      root.classList.remove("dark-mode");
    } else {
      root.classList.remove("light-mode");
      root.classList.add("dark-mode");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Save schedule changes
  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  // Auto-switch based on schedule
  useEffect(() => {
    if (!schedule.enabled) return;

    const check = () => {
      const now = new Date();
      const hhmm = now.getHours() * 60 + now.getMinutes();
      const lightMins = timeToMins(schedule.lightFrom);
      const darkMins = timeToMins(schedule.darkFrom);

      let desired;
      if (lightMins < darkMins) {
        // Normal: light 07:00–20:00, dark outside
        desired = hhmm >= lightMins && hhmm < darkMins ? "light" : "dark";
      } else {
        // Inverted: light spans midnight
        desired = hhmm >= lightMins || hhmm < darkMins ? "light" : "dark";
      }
      setTheme(desired);
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [schedule]);

  const toggleTheme = () => {
    setTheme(t => t === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, schedule, setSchedule }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

function timeToMins(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}