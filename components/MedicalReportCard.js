"use client";
import React, { useState, useEffect } from "react";

export default function MedicalReportCard({ data }) {
  const [targetLang, setTargetLang] = useState("hi-IN");
  const [translatedData, setTranslatedData] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const languages = [
    { code: "hi-IN", label: "हिन्दी (Hindi)" },
    { code: "ta-IN", label: "தமிழ் (Tamil)" },
    { code: "te-IN", label: "తెలుగు (Telugu)" },
    { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
    { code: "ml-IN", label: "മലയാളം (Malayalam)" },
    { code: "mr-IN", label: "मराठी (Marathi)" },
    { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
    { code: "bn-IN", label: "বাংলা (Bengali)" },
    { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
    { code: "en-IN", label: "English" },
  ];

  // Whenever scanning changes, reset translation
  useEffect(() => {
    setTranslatedData(null);
    setAudioUrl(null);
    setPlayingAudio(false);
  }, [data]);

  if (!data) {
    return (
      <div className="report-empty-state glass-panel">
        <div className="empty-icon text-cyan-400">📊</div>
        <h3>No Document Loaded</h3>
        <p className="text-gray-400 max-w-xs text-center mx-auto text-xs mt-1">
          Perform a visual scan or select a Quick-Launch demo prescription to review simplified details here.
        </p>
      </div>
    );
  }

  const { title, type, confidence, summary, medicines, vitals, general_recommendations, warning_triggers } =
    translatedData || data;

  const demoMode = data.demoMode;

  const handleTranslate = async (lang) => {
    setTargetLang(lang);
    if (lang === "en-IN" || lang === "en") {
      setTranslatedData(null);
      return;
    }

    setTranslating(true);
    try {
      // Gather all strings for batch translation
      const textsToTranslate = [];
      
      // 1. Title & Summary
      textsToTranslate.push(data.title || "");
      textsToTranslate.push(data.summary || "");

      // 2. Medicines
      data.medicines?.forEach((m) => {
        textsToTranslate.push(m.purpose || "");
        textsToTranslate.push(m.dosage || "");
        textsToTranslate.push(m.duration || "");
        textsToTranslate.push(m.warning || "");
      });

      // 3. Vitals
      data.vitals?.forEach((v) => {
        textsToTranslate.push(v.explanation || "");
      });

      // 4. Recommendations
      data.general_recommendations?.forEach((rec) => {
        textsToTranslate.push(rec || "");
      });

      // 5. Warnings
      data.warning_triggers?.forEach((warn) => {
        textsToTranslate.push(warn || "");
      });

      // Call batch translate API in one go
      const res = await fetch("/api/sarvam/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: textsToTranslate, targetLang: lang }),
      });
      
      const d = await res.json();
      const translatedTexts = d.translatedTexts || textsToTranslate;

      // Unpack values
      let idx = 0;
      const tTitle = translatedTexts[idx++] || data.title;
      const tSummary = translatedTexts[idx++] || data.summary;

      const tMedicines = data.medicines?.map((m) => ({
        name: m.name,
        purpose: translatedTexts[idx++] || m.purpose,
        dosage: translatedTexts[idx++] || m.dosage,
        duration: translatedTexts[idx++] || m.duration,
        warning: translatedTexts[idx++] || m.warning,
      })) || [];

      const tVitals = data.vitals?.map((v) => ({
        name: v.name,
        value: v.value,
        range: v.range,
        status: v.status,
        explanation: translatedTexts[idx++] || v.explanation,
      })) || [];

      const tRecommendations = data.general_recommendations?.map(() => {
        return translatedTexts[idx++] || "";
      }) || [];

      const tWarnings = data.warning_triggers?.map(() => {
        return translatedTexts[idx++] || "";
      }) || [];

      setTranslatedData({
        ...data,
        title: tTitle,
        summary: tSummary,
        medicines: tMedicines,
        vitals: tVitals,
        general_recommendations: tRecommendations,
        warning_triggers: tWarnings,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to translate details.");
    } finally {
      setTranslating(false);
    }
  };

  const handleSpeakText = async (textToSpeak) => {
    if (!textToSpeak) return;

    setPlayingAudio(true);
    try {
      const response = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, targetLang }),
      });

      const result = await response.json();
      if (result.sarvam && result.audio) {
        // Base64 audio stream play
        const audioSrc = `data:audio/wav;base64,${result.audio}`;
        const audio = new Audio(audioSrc);
        audio.play();
        audio.onended = () => setPlayingAudio(false);
      } else {
        // Fallback standard Browser Web Speech API
        const speech = new SpeechSynthesisUtterance(textToSpeak);
        speech.lang = targetLang === "hi-IN" ? "hi-IN" : "en-US";
        window.speechSynthesis.speak(speech);
        speech.onend = () => setPlayingAudio(false);
      }
    } catch (err) {
      console.error(err);
      setPlayingAudio(false);
    }
  };

  const speakDosageSchedule = () => {
    let narration = `Here is your summary. Title is ${title}. ${summary}. `;
    if (medicines && medicines.length > 0) {
      narration += `You have ${medicines.length} medicines. `;
      medicines.forEach((med, idx) => {
        narration += `Medicine ${idx + 1}: ${med.name}. Instructions: ${med.dosage} for ${med.duration}. Purpose: ${med.purpose}. Warning: ${med.warning}. `;
      });
    }
    if (vitals && vitals.length > 0) {
      vitals.forEach((v) => {
        if (v.status !== "Nominal") {
          narration += `Warning: your ${v.name} is ${v.status} at ${v.value}. Normal is ${v.range}. `;
        }
      });
    }
    handleSpeakText(narration);
  };

  return (
    <div className="report-card-detail glass-panel">
      {/* Title block */}
      <div className="detail-header-row">
        <div>
          <span className="report-type-badge">{type}</span>
          <h2 className="glow-text text-xl mt-1">{title}</h2>
          <div className="confidence-row">
            <span className="confidence-label">AI Analysis Confidence:</span>
            <span className="confidence-val font-semibold text-cyan-400">{confidence}%</span>
            {demoMode && <span className="demo-badge">Demo Data Mode</span>}
          </div>
        </div>

        {/* Action translation buttons */}
        <div className="translate-bar">
          <select
            value={targetLang}
            onChange={(e) => handleTranslate(e.target.value)}
            disabled={translating}
            className="lang-select-small border border-cyan-500/30"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={speakDosageSchedule}
            disabled={playingAudio || translating}
            className={`audio-readout-btn ${playingAudio ? "playing" : ""}`}
            title="Read schedule aloud"
          >
            🔊 {playingAudio ? "Reading..." : "Read Aloud"}
          </button>

          <button
            onClick={() => window.print()}
            className="pdf-export-btn"
            title="Export this report as a clean PDF"
          >
            🖨️ Export PDF
          </button>
        </div>
      </div>

      {translating && (
        <div className="translating-indicator">
          <span className="spinner">⌛</span> Translating medical report details...
        </div>
      )}

      {/* Summary */}
      <div className="summary-section py-4 border-b border-gray-800/60">
        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1"> Layman Overview</h4>
        <p className="text-sm text-gray-200 leading-relaxed font-sans">{summary}</p>
      </div>

      {/* Medicines Table */}
      {medicines && medicines.length > 0 && (
        <div className="medicines-section py-4 border-b border-gray-800/60">
          <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">📋 Medication Guide (Simplified)</h4>
          <div className="meds-cards-grid">
            {medicines.map((med, idx) => (
              <div key={idx} className="med-details-card glass-panel border border-cyan-500/20">
                <div className="med-header flex justify-between items-start">
                  <h5 className="text-emerald-400 font-bold text-sm">💊 {med.name}</h5>
                  <span className="med-duration-tag">{med.duration}</span>
                </div>
                <div className="med-body mt-2 text-xs text-gray-300 space-y-2">
                  <p>
                    <strong>Purpose:</strong> {med.purpose}
                  </p>
                  <p>
                    <strong>Instructions:</strong> {med.dosage}
                  </p>
                  {med.warning && (
                    <div className="med-warning border-l-2 border-amber-500 pl-2 text-amber-300/90 text-2xs mt-1">
                      ⚠️ {med.warning}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vitals Table */}
      {vitals && vitals.length > 0 && (
        <div className="vitals-section py-4 border-b border-gray-800/60">
          <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">🩸 Vital Metrics & Lab Indicators</h4>
          <div className="vitals-list space-y-3">
            {vitals.map((vital, idx) => {
              const isNominal = vital.status === "Nominal";
              const isHigh = vital.status === "High";

              return (
                <div key={idx} className="vital-item-row flex flex-col md:flex-row md:items-center justify-between p-3 glass-panel border border-gray-800/60 rounded">
                  <div className="vital-left md:max-w-xs">
                    <span className="vital-name font-bold text-sm text-gray-200">{vital.name}</span>
                    <p className="vital-explanation text-3xs text-gray-400 leading-normal mt-0.5">{vital.explanation}</p>
                  </div>
                  
                  {/* Status meter */}
                  <div className="vital-right mt-2 md:mt-0 flex items-center gap-4">
                    <div className="vital-val-ref text-right">
                      <span className="vital-value text-sm font-mono font-bold block">{vital.value}</span>
                      <span className="vital-ref text-4xs text-gray-500 font-mono">Ref: {vital.range}</span>
                    </div>
                    
                    <span
                      className={`vital-status-pill ${
                        isNominal ? "nominal" : isHigh ? "high" : "low"
                      }`}
                    >
                      {vital.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations & Alert Triggers */}
      {(general_recommendations?.length > 0 || warning_triggers?.length > 0) && (
        <div className="recommendations-warnings grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {general_recommendations?.length > 0 && (
            <div className="rec-box glass-panel border border-emerald-500/10 p-3 rounded">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">🌿 Wellness Recommendations</h5>
              <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                {general_recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {warning_triggers?.length > 0 && (
            <div className="warning-box glass-panel border border-red-500/10 p-3 rounded">
              <h5 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">⚠️ Medical Alert Triggers</h5>
              <ul className="list-disc pl-4 space-y-1 text-xs text-red-300">
                {warning_triggers.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
