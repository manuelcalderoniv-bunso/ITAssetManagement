import { useEffect, useRef, useState } from "react";

/**
 * Web Speech API wrapper. Supports English (en-PH / en-US) and Filipino (fil-PH).
 * Availability depends on the browser - Chrome and Edge support it today.
 */
export function useVoiceSearch({ onResult, lang = "en-PH" } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const recognition = useRef(null);

  useEffect(() => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!API) {
      setSupported(false);
      return;
    }

    const rec = new API();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setError("");
      setTranscript("");
    };

    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      if (event.results[event.results.length - 1].isFinal) {
        onResult?.(text.trim());
      }
    };

    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked. Allow it in the browser settings.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else {
        setError("Voice input failed. Try again.");
      }
    };

    rec.onend = () => setListening(false);

    recognition.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    };
  }, [lang, onResult]);

  const start = () => {
    if (!recognition.current) return;
    try {
      recognition.current.start();
    } catch {
      // start() throws if already running - ignore
    }
  };

  const stop = () => {
    try {
      recognition.current?.stop();
    } catch {
      // ignore
    }
  };

  const toggle = () => (listening ? stop() : start());

  return { listening, transcript, supported, error, start, stop, toggle };
}
