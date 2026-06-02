"use client";
import React, { useState, useEffect } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import PrescriptionScanner from "@/components/PrescriptionScanner";
import SymptoGraph from "@/components/SymptoGraph";
import MedicalReportCard from "@/components/MedicalReportCard";
import IntakeTracker from "@/components/IntakeTracker";
import MedicalChatbot from "@/components/MedicalChatbot";

export default function DashboardHome() {
  const [scanResult, setScanResult] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [neo4jStatus, setNeo4jStatus] = useState("Checking...");
  const [scanHistory, setScanHistory] = useState([]);

  // Load default graph data & local storage cache history on startup
  useEffect(() => {
    // Check if graph database works
    fetch("/api/graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionName: "Hypertension" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setGraphData(data);
        if (data.neo4j) {
          setNeo4jStatus("LIVE AURA DB CONNECTED");
        } else {
          setNeo4jStatus("DEMO MODE FALLBACK (LOCAL ONTOLOGY)");
        }
      })
      .catch((err) => {
        console.error("Graph startup error:", err);
        setNeo4jStatus("DISCONNECTED / OFFLINE");
      });

    // Load Scan History from LocalStorage
    const savedHistory = localStorage.getItem("symptograph_scan_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setScanHistory(parsed);
        if (parsed.length > 0) {
          // Default to the most recent scan result to provide a warm dashboard state!
          setScanResult(parsed[0]);
          loadGraphForCondition(parsed[0]);
        }
      } catch (e) {
        console.warn("Failed to parse local history:", e);
      }
    }
  }, []);

  // Separate function to load graph nodes
  const loadGraphForCondition = async (result) => {
    try {
      const response = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditionName: result.vitals?.length > 0 ? "Type 2 Diabetes" : undefined,
          medicineName: result.medicines?.[0]?.name,
        }),
      });

      const data = await response.json();
      if (response.ok && data.found) {
        setGraphData(data);
      }
    } catch (err) {
      console.error("Failed to query graph API:", err);
    }
  };

  const handleScanResult = async (result) => {
    setScanResult(result);
    setLoading(true);

    // Save to Scan History logs
    const updatedHistory = [
      result,
      ...scanHistory.filter((h) => h.title !== result.title),
    ].slice(0, 6); // Keep last 6 scans

    setScanHistory(updatedHistory);
    localStorage.setItem("symptograph_scan_history", JSON.stringify(updatedHistory));

    // Load graph nodes
    await loadGraphForCondition(result);
    setLoading(false);
  };

  const handleHistoryClick = async (histItem) => {
    setScanResult(histItem);
    setLoading(true);
    await loadGraphForCondition(histItem);
    setLoading(false);
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    setScanResult(null);
    localStorage.removeItem("symptograph_scan_history");
  };

  const handleSeedDatabase = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed");
      const data = await res.json();
      if (res.ok) {
        setNeo4jStatus("LIVE AURA DB SEEDED & CONNECTED");
        alert("Success: " + data.message);
        // Refresh graph
        const graphRes = await fetch("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditionName: "Hypertension" }),
        });
        const graphDataNew = await graphRes.json();
        setGraphData(graphDataNew);
      } else {
        alert("Seed error: " + (data.error || "Check credentials."));
      }
    } catch (err) {
      console.error(err);
      alert("Database seed failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Floating Canvas */}
      <ParticleBackground />

      <div className="dashboard-container">
        {/* Cyber Command Header */}
        <header className="dashboard-header">
          <div className="app-brand">
            <span className="app-logo">🧬</span>
            <div>
              <h1 className="glow-text text-2xl font-bold">SymptoGraph AI</h1>
              <span className="app-title-desc">Medical Prescription Interpreter & Health Ontology</span>
            </div>
          </div>

          <div className="hud-status-panel flex items-center gap-4 text-xs font-mono">
            <div className="status-item flex items-center gap-2">
              <span className="status-dot animate-ping inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-gray-400">Scanner:</span>
              <span className="text-cyan-400 font-bold">ONLINE</span>
            </div>

            <div className="status-item flex items-center gap-2 border-l border-gray-800 pl-4">
              <span className="text-gray-400">Database:</span>
              <span
                className={`font-bold ${
                  neo4jStatus.includes("LIVE") ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {neo4jStatus}
              </span>
              {!neo4jStatus.includes("LIVE") && (
                <button
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-3xs px-2 py-0.5 rounded cursor-pointer transition ml-2"
                  onClick={handleSeedDatabase}
                  title="Seed Neo4j database with initial nodes"
                >
                  ⚡ Seed Graph
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Scan history logs bar */}
        {scanHistory.length > 0 && (
          <div className="scan-history-bar glass-panel border border-cyan-500/10 mb-6 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider">
              <span>🕒</span> SCAN HISTORY LOGS:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {scanHistory.map((hist, idx) => {
                const isActive = scanResult?.title === hist.title;
                return (
                  <button
                    key={idx}
                    onClick={() => handleHistoryClick(hist)}
                    className={`history-pill-btn text-2xs px-3 py-1.5 rounded transition ${
                      isActive
                        ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                    }`}
                  >
                    {hist.title.split(" (")[0]}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleClearHistory}
              className="text-3xs text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
        )}

        {/* Dashboard Workspace Layout */}
        <main className="dashboard-grid">
          {/* Left Grid: Scanners and Relationships */}
          <div className="grid-left">
            <PrescriptionScanner
              onScanResult={handleScanResult}
              onScanLoading={(val) => setLoading(val)}
            />
            {graphData && <SymptoGraph data={graphData} />}
          </div>

          {/* Right Grid: Detailed reports and calendar adherence */}
          <div className="grid-right">
            <MedicalReportCard data={scanResult} />
            <IntakeTracker medicines={scanResult?.medicines} />
          </div>
        </main>

        <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-900 pt-6">
          <p>© 2026 SymptoGraph AI. Hack Hazards Medical Concept Engine. For educational/demo use only.</p>
        </footer>
      </div>

      {/* Loading & Parsing overlay screen */}
      {loading && (
        <div className="global-analyzer-overlay">
          <div className="radar-spinner" />
          <p className="loading-text glow-text">INTELLIGENT DIAGNOSTIC PARSER ACTIVE...</p>
          <span className="text-xs text-cyan-400 font-mono">
            Translating report scripts via Gemini & Sarvam AI
          </span>
        </div>
      )}

      {/* Floating conversational chatbot */}
      <MedicalChatbot documentContext={scanResult} />
    </div>
  );
}
