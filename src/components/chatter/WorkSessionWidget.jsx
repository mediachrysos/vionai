import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkSessionWidget({ email }) {
  const [isWorking, setIsWorking] = useState(false);
  const [sessionTime, setSessionTime] = useState("00:00");

  useEffect(() => {
    let interval;
    if (isWorking) {
      const start = Date.now();
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const mins = Math.floor((elapsed % 3600) / 60);
        setSessionTime(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  const toggleWork = async () => {
    setIsWorking(!isWorking);
    if (!isWorking) {
      setSessionTime("00:00");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Pracuješ?</p>
        <p className="text-lg font-bold text-gray-900">{sessionTime}</p>
      </div>
      <Button
        onClick={toggleWork}
        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
          isWorking
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-br from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
        }`}
      >
        {isWorking ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
    </div>
  );
}