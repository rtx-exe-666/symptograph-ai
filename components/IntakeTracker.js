"use client";
import React, { useState, useEffect } from "react";

export default function IntakeTracker({ medicines }) {
  const [points, setPoints] = useState(100);
  const [trackerData, setTrackerData] = useState({});
  
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = [
    { id: "morning", label: "🌅 Morning", time: "08:00 AM" },
    { id: "afternoon", label: "☀️ Afternoon", time: "01:30 PM" },
    { id: "night", label: "🌃 Night", time: "09:00 PM" }
  ];

  // Default medicines list if none is scanned yet
  const defaultMedicines = medicines && medicines.length > 0 ? medicines : [
    { name: "Metformin 500mg", dosage: "twice daily after meals" },
    { name: "Lisinopril 10mg", dosage: "once in the morning" }
  ];

  // Load tracker status and points from localStorage
  useEffect(() => {
    const savedPoints = localStorage.getItem("symptograph_wellness_points");
    const savedTracker = localStorage.getItem("symptograph_intake_tracker");
    
    if (savedPoints) setPoints(parseInt(savedPoints));
    if (savedTracker) setTrackerData(JSON.parse(savedTracker));
  }, []);

  const handleCheck = (day, medName, slotId) => {
    const key = `${day}-${medName}-${slotId}`;
    const wasChecked = trackerData[key];

    const updated = {
      ...trackerData,
      [key]: !wasChecked
    };
    
    setTrackerData(updated);
    localStorage.setItem("symptograph_intake_tracker", JSON.stringify(updated));

    // Update Points (+15 if checking, -15 if unchecking)
    const diff = !wasChecked ? 15 : -15;
    const newPoints = Math.max(0, points + diff);
    setPoints(newPoints);
    localStorage.setItem("symptograph_wellness_points", newPoints.toString());

    // Simple custom audio feedback (synthesized frequency click using Web Audio API)
    if (!wasChecked) {
      playBeep(650, "sine", 0.08);
      setTimeout(() => playBeep(850, "sine", 0.12), 60);
    } else {
      playBeep(350, "triangle", 0.1);
    }
  };

  const playBeep = (freq, type, duration) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  // Determine if a slot is recommended based on dosage string
  const isSlotRecommended = (dosage, slotId) => {
    const d = dosage.toLowerCase();
    if (slotId === "morning") {
      return d.includes("morning") || d.includes("twice") || d.includes("three times") || d.includes("breakfast") || d.includes("daily") || d.includes("once");
    }
    if (slotId === "afternoon") {
      return d.includes("afternoon") || d.includes("twice") || d.includes("three times") || d.includes("lunch");
    }
    if (slotId === "night") {
      return d.includes("night") || d.includes("twice") || d.includes("three times") || d.includes("bedtime") || d.includes("dinner") || d.includes("evening");
    }
    return true;
  };

  return (
    <div className="tracker-card glass-panel">
      <div className="tracker-header-row">
        <div>
          <h3 className="glow-text">📅 Smart Adherence Tracker</h3>
          <p className="tracker-subtitle">Keep track of your dosages. Check-in to earn health adherence points!</p>
        </div>
        <div className="points-hud glass-panel border border-emerald-500/50">
          <span className="points-label">🛡️ Wellness Score</span>
          <span className="points-value glow-text-emerald">{points} XP</span>
        </div>
      </div>

      <div className="tracker-grid-container">
        <table className="tracker-table">
          <thead>
            <tr>
              <th className="th-med">Medication / Schedule</th>
              {days.map(d => (
                <th key={d} className="th-day">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {defaultMedicines.map((med, mIdx) => (
              <React.Fragment key={mIdx}>
                <tr className="med-row-header">
                  <td colSpan={8} className="med-title-cell">
                    💊 <strong>{med.name}</strong> <span className="med-instruction-badge">{med.dosage}</span>
                  </td>
                </tr>
                {slots.map((slot) => {
                  const active = isSlotRecommended(med.dosage, slot.id);
                  if (!active) return null; // Hide slot if not specified in prescription

                  return (
                    <tr key={slot.id} className="slot-row">
                      <td className="slot-name-cell">
                        <span className="slot-bullet">{slot.label}</span>
                        <span className="slot-time">{slot.time}</span>
                      </td>
                      {days.map((day) => {
                        const isChecked = !!trackerData[`${day}-${med.name}-${slot.id}`];
                        return (
                          <td key={day} className="checkbox-cell">
                            <button
                              className={`tracker-checkbox-btn ${isChecked ? "checked" : ""}`}
                              onClick={() => handleCheck(day, med.name, slot.id)}
                            >
                              {isChecked && "✓"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tracker-footer border-t border-gray-800/80 pt-4 flex justify-between items-center text-xs text-gray-400">
        <p>💡 Tip: Adherence scores unlock badges. 100% adherence gives "Wellness Shield".</p>
        <button
          className="text-cyan-400 underline cursor-pointer"
          onClick={() => {
            setTrackerData({});
            setPoints(100);
            localStorage.removeItem("symptograph_intake_tracker");
            localStorage.setItem("symptograph_wellness_points", "100");
          }}
        >
          Reset Data
        </button>
      </div>
    </div>
  );
}
