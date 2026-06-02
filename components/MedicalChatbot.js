"use client";
import React, { useState, useEffect, useRef } from "react";

export default function MedicalChatbot({ documentContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am your SymptoGraph AI assistant. Scan a prescription or lab report, and I can explain your medicines, vitals, dosages, or side-effects in simple layman terms. Ask me anything!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sttStatus, setSttStatus] = useState("idle"); // idle | recording | processing
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle Quick Suggestion clicks
  const handleSuggestion = (suggestionText) => {
    submitMessage(suggestionText);
  };

  // Submit message to API
  const submitMessage = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          documentContext: documentContext || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error: Failed to process request. Make sure API keys are active." },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection failed. Please check your internet connection." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    submitMessage(inputValue);
  };

  // Browser STT Fallback for Chat input
  const startSTT = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Browser Speech Recognition not supported.");
      return;
    }

    setSttStatus("recording");
    const recog = new SR();
    recog.lang = "en-IN";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recognitionRef.current = recog;

    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInputValue(transcript);
      setSttStatus("idle");
    };

    recog.onerror = () => setSttStatus("idle");
    recog.onend = () => setSttStatus("idle");
    recog.start();
  };

  const stopSTT = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setSttStatus("idle");
    }
  };

  const handleVoiceToggle = () => {
    if (sttStatus === "recording") {
      stopSTT();
    } else {
      startSTT();
    }
  };

  // Read Assistant message aloud
  const handleSpeakText = (text, idx) => {
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel(); // stop any active synthesis
    setSpeakingIdx(idx);

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.onend = () => setSpeakingIdx(null);
    speech.onerror = () => setSpeakingIdx(null);
    window.speechSynthesis.speak(speech);
  };

  // Close active speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="medical-chatbot-container">
      {/* Floating launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`chatbot-launcher-btn ${isOpen ? "active" : ""}`}
        title="Open SymptoGraph AI Assistant"
      >
        <span className="launcher-icon">{isOpen ? "✕" : "💬"}</span>
        {!isOpen && <span className="launcher-pulse-ring" />}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="chatbot-drawer glass-panel border border-cyan-500/40">
          {/* Header */}
          <div className="chatbot-header border-b border-gray-800/80 pb-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="header-avatar">🧬</span>
              <div>
                <h4 className="glow-text text-sm font-bold">SymptoGraph AI Chat</h4>
                <p className="text-4xs text-emerald-400 font-mono tracking-wide">ASSISTANT ONLINE</p>
              </div>
            </div>
            <button className="text-gray-500 hover:text-white" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Active Patient Profile HUD banner */}
          <div className="active-context-banner text-3xs px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 rounded flex justify-between items-center">
            <span className="text-gray-400">Context:</span>
            <span className="text-cyan-400 font-semibold truncate max-w-40">
              {documentContext ? documentContext.title.split(" (")[0] : "None (General Mode)"}
            </span>
          </div>

          {/* Chat Messages viewport */}
          <div className="chat-messages-viewport">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div key={idx} className={`chat-message-row ${isAssistant ? "assistant" : "user"}`}>
                  <div className="message-bubble">
                    <p className="message-text text-2xs leading-normal whitespace-pre-wrap">{msg.content}</p>
                    {isAssistant && (
                      <button
                        onClick={() => handleSpeakText(msg.content, idx)}
                        className={`speak-bubble-btn ${speakingIdx === idx ? "active" : ""}`}
                        title="Read aloud"
                      >
                        {speakingIdx === idx ? "⏹️ Stop" : "🔊 Speak"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="chat-message-row assistant">
                <div className="message-bubble loader-bubble flex gap-1 items-center p-2.5">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions when history is clean or context is scanned */}
          {messages.length === 1 && documentContext && (
            <div className="quick-suggestions-row px-1 flex flex-wrap gap-1.5 justify-center mb-2">
              <button
                onClick={() => handleSuggestion("What does my scanned prescription treat?")}
                className="suggest-btn"
              >
                ❓ What treats?
              </button>
              <button
                onClick={() => handleSuggestion("Are there any side effects I should watch out for?")}
                className="suggest-btn"
              >
                ⚠️ Side-effects
              </button>
              <button
                onClick={() => handleSuggestion("What are some simple food or exercise recommendations?")}
                className="suggest-btn"
              >
                🌿 Lifestyle habits
              </button>
            </div>
          )}

          {/* Input control tray */}
          <form onSubmit={handleSend} className="chat-input-form border-t border-gray-800/80 pt-3">
            <div className="chat-input-wrapper flex gap-2">
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`chat-mic-btn ${sttStatus === "recording" ? "recording" : ""}`}
                title="Speak your question"
              >
                {sttStatus === "recording" ? "⏹️" : "🎙️"}
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about medications, diets..."
                className="chat-input-field flex-1"
                disabled={loading}
              />
              <button type="submit" className="chat-send-btn bg-cyan-500 hover:bg-cyan-600 text-black" disabled={loading}>
                ➤
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
