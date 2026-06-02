"use client";
import React, { useState, useRef, useEffect } from "react";

export default function PrescriptionScanner({ onScanResult, onScanLoading }) {
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Languages list for Sarvam
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
    { code: "en-IN", label: "English (India)" },
  ];

  // Mock document items for instant demo scans
  const demoItems = [
    {
      title: "Cardiac Report (Hypertension)",
      icon: "❤️",
      type: "text",
      payload: "Patient has high blood pressure (145/95 mmHg), complaining of mild dizziness. Prescribe Lisinopril 10mg once daily in morning. Instruct patient to follow a low-sodium diet and start cardio exercise.",
    },
    {
      title: "Diabetes Treatment Plan",
      icon: "🩸",
      type: "text",
      payload: "Lab shows HbA1c is 7.4%. Patient is experiencing fatigue. Recommend starting Metformin 500mg twice daily with meals. Advise a 30-minute walk daily and low-glycemic foods.",
    },
    {
      title: "GERD & Gastric Report",
      icon: "🧪",
      type: "text",
      payload: "Severe heartburn and acid reflux, affecting the digestive system. Prescribe Omeprazole 20mg once daily before breakfast. Instruct patient to avoid late-night meals and fatty foods.",
    },
  ];

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Convert image to base64 and call classify API
  const processImageFile = (file) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG/JPEG) representing the report or prescription.");
      return;
    }

    onScanLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64data = reader.result.split(",")[1];
      const mimeType = file.type;

      try {
        const response = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "image",
            image: base64data,
            mimeType: mimeType,
            detectedItem: file.name.toLowerCase().includes("blood") ? "report-blood" : "cardio",
          }),
        });

        const data = await response.json();
        if (response.ok) {
          onScanResult(data);
        } else {
          alert("Image analysis error: " + (data.error || "Failed to scan report."));
          onScanLoading(false);
        }
      } catch (err) {
        console.error(err);
        alert("Scan request failed. Make sure Next.js API is working.");
        onScanLoading(false);
      }
    };
  };

  // Submit typed or voice query
  const handleTextSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onScanLoading(true);
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          text: inputText,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onScanResult(data);
      } else {
        alert("Analysis error: " + (data.error || "Failed to parse text."));
        onScanLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze input.");
      onScanLoading(false);
    }
  };

  // Click on a demo report
  const handleDemoClick = async (demo) => {
    onScanLoading(true);
    setInputText(demo.payload);
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          text: demo.payload,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onScanResult(data);
      } else {
        onScanLoading(false);
      }
    } catch (err) {
      console.error(err);
      onScanLoading(false);
    }
  };

  const [sttStatus, setSttStatus] = useState("idle"); // idle | recording | processing | error
  const recognitionRef = useRef(null);

  // Browser STT Fallback
  const useBrowserSTT = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    setSttStatus("recording");
    const recog = new SR();
    recog.lang = language || "en-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recognitionRef.current = recog;

    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);
      setSttStatus("idle");
      
      // Proactively submit the text
      onScanLoading(true);
      try {
        const responseText = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "text", text: transcript }),
        });
        const parsedData = await responseText.json();
        onScanResult(parsedData);
      } catch (err) {
        console.error(err);
        onScanLoading(false);
      }
    };
    recog.onerror = () => setSttStatus("error");
    recog.onend = () => setSttStatus("idle");
    recog.start();
    return true;
  };

  // Sarvam STT Core
  const useSarvamSTT = async () => {
    setSttStatus("recording");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setSttStatus("processing");
        onScanLoading(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "speech.webm");
          formData.append("language_code", language);

          const response = await fetch("/api/sarvam/stt", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          if (data.transcript) {
            setInputText(data.transcript);
            const responseText = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "text", text: data.transcript }),
            });
            const parsedData = await responseText.json();
            onScanResult(parsedData);
          } else {
            // Fallback to browser SpeechRecognition if Sarvam isn't configured
            const fallbackWorked = useBrowserSTT();
            if (!fallbackWorked) {
              alert(data.note || "Speech transcription failed.");
              onScanLoading(false);
            }
          }
        } catch (err) {
          console.error("STT API failed, falling back to browser SpeechRecognition:", err);
          const fallbackWorked = useBrowserSTT();
          if (!fallbackWorked) {
            alert("Speech transcription failed.");
            onScanLoading(false);
          }
        }
        setSttStatus("idle");
      };

      recorder.start();

      // Auto stop after 8 seconds of silence/speech to protect API limits
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 8000);

    } catch (err) {
      console.error("Microphone device grab failed, trying browser Recognition:", err);
      const fallbackWorked = useBrowserSTT();
      if (!fallbackWorked) {
        setSttStatus("error");
        alert("Microphone permission denied.");
      }
    }
  };

  const handleVoiceToggle = () => {
    if (sttStatus === "recording") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
        setSttStatus("idle");
      }
      return;
    }
    if (sttStatus === "processing") return;
    useSarvamSTT();
  };

  // Camera functionality
  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraLoading(false);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera device.");
      setIsCameraActive(false);
      setCameraLoading(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      const base64data = dataUrl.split(",")[1];

      // Close camera
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);

      // Process captured image
      onScanLoading(true);
      fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          image: base64data,
          mimeType: "image/jpeg",
          detectedItem: "cardio",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          onScanResult(data);
        })
        .catch((err) => {
          console.error(err);
          onScanLoading(false);
        });
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video) {
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    setIsCameraActive(false);
  };

  return (
    <div className="scanner-card glass-panel">
      <div className="scanner-header">
        <h2 className="glow-text">🔬 Medical Scan Console</h2>
        <p className="scanner-subtitle">
          Upload report, snap prescription prescription, or dictate symptoms in your native tongue.
        </p>
      </div>

      <div className="scanner-layout">
        {/* Upload Zone */}
        <div
          className={`upload-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload-input"
            className="file-hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <div className="upload-inner">
            <div className="upload-icon">📄</div>
            <p className="upload-text">
              Drag & drop report or{" "}
              <label htmlFor="file-upload-input" className="highlight-link">
                Browse Files
              </label>
            </p>
            <span className="file-formats">Supports PNG, JPG, WebP</span>
          </div>

          <div className="scanner-buttons">
            <button className="scan-btn secondary" onClick={startCamera}>
              📷 Use Camera
            </button>
          </div>
        </div>

        {/* Text/Voice Search */}
        <form onSubmit={handleTextSubmit} className="text-voice-form">
          <div className="voice-controls">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={`voice-mic-btn ${sttStatus === "recording" ? "recording" : ""}`}
              onClick={handleVoiceToggle}
              disabled={sttStatus === "processing"}
              title={
                sttStatus === "recording"
                  ? "Recording... click to stop"
                  : sttStatus === "processing"
                  ? "Transcribing..."
                  : "Click to speak symptoms"
              }
            >
              <span className="mic-icon">
                {sttStatus === "idle" && "🎙️"}
                {sttStatus === "recording" && "⏹️"}
                {sttStatus === "processing" && "⏳"}
                {sttStatus === "error" && "❌"}
              </span>
              {sttStatus === "idle" && "Click to Talk"}
              {sttStatus === "recording" && "Stop"}
              {sttStatus === "processing" && "Transcribing..."}
              {sttStatus === "error" && "Retry"}
            </button>
          </div>

          <div className="search-input-wrapper">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. High blood sugar, HbA1c is 7.2%, taking metformin..."
              className="search-input"
            />
            <button type="submit" className="scan-btn primary">
              Analyze Request
            </button>
          </div>
        </form>
      </div>

      {/* Demo shortcuts */}
      <div className="demo-shortcuts">
        <span className="demo-label font-bold text-xs text-gray-400">DEMO QUICK-LAUNCH:</span>
        <div className="demo-buttons">
          {demoItems.map((demo, idx) => (
            <button
              key={idx}
              className="demo-btn"
              onClick={() => handleDemoClick(demo)}
            >
              <span>{demo.icon}</span> {demo.title}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraActive && (
        <div className="camera-modal">
          <div className="camera-content glass-panel border border-cyan-500">
            <div className="camera-header-row">
              <h3>📷 Prescription Capture</h3>
              <button className="close-btn" onClick={stopCamera}>
                ✕
              </button>
            </div>
            <div className="video-container">
              {cameraLoading && <div className="loader">Initializing Camera...</div>}
              <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
              <div className="laser-scanner-line" />
            </div>
            <div className="camera-actions">
              <button className="scan-btn primary w-full" onClick={capturePhoto}>
                Capture & OCR Parse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
