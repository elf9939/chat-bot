import { useState, useRef, useCallback } from "react";

// ── API keys from environment variables ─────────────────────────────────────
const XI_KEY = process.env.REACT_APP_ELEVENLABS_KEY;
const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

// ── ElevenLabs voice IDs ─────────────────────────────────────────────────────
const VOICE_IDS = {
  tony:   "TxGEqnHWrfWFTfGW9XjX", // Josh
  karen:  "EXAVITQu4vr4xnSDxMaL", // Bella
  derek:  "VR6AewLTigWG4xSOukaG", // Arnold
  maria:  "pFZP5JQG7iQjIQuC4Bku", // Lily
  james:  "onwK4e9ZLuTAKqWW03F9", // Daniel
  linda:  "XB0fDUnXU5powFXDhCwa", // Charlotte
  carlos: "N2lVS1w4EtoT3dr4eOWO", // Callum
  sandra: "jsCqWAovK2LkecY7zXl4", // Gigi
};

// ── Personas ─────────────────────────────────────────────────────────────────
const PERSONAS = [
  { id: "tony",   name: "Tony Rizzo",     business: "Tony's Pizza",        type: "Restaurant owner",      difficulty: "Medium", mood: "rushed",    emoji: "🍕", personality: "Busy, always multitasking, impatient. Has a Facebook page but no real website. Price-sensitive. Not rude but distracted." },
  { id: "karen",  name: "Karen Bloom",    business: "Bloom Hair Studio",   type: "Salon owner",           difficulty: "Easy",   mood: "warm",      emoji: "💇", personality: "Friendly and chatty. Wants to attract younger clients. Open to new ideas. Goes off on tangents about her salon." },
  { id: "derek",  name: "Derek Stone",    business: "Stone's Auto Repair", type: "Auto shop owner",       difficulty: "Hard",   mood: "suspicious",emoji: "🔧", personality: "Very skeptical. Got burned by a web designer before. Blunt, short answers. Needs real proof before he'll listen." },
  { id: "maria",  name: "Maria Gonzalez", business: "Maria's Cleaning",    type: "Cleaning business",     difficulty: "Medium", mood: "neutral",   emoji: "🧹", personality: "Polite but busy. Most clients from word of mouth. Worried about cost. Will listen if you make a compelling case." },
  { id: "james",  name: "James Okafor",   business: "Okafor's Barbershop", type: "Barbershop owner",      difficulty: "Medium", mood: "curious",   emoji: "✂️", personality: "Young, tech-savvy. Has Instagram but knows he needs a booking site. Will ask smart questions about cost and SEO." },
  { id: "linda",  name: "Linda Park",     business: "Park's Dry Cleaning", type: "Dry cleaner",           difficulty: "Hard",   mood: "dismissive",emoji: "👔", personality: "Older, set in her ways. 25 years without a website. Doesn't think the internet matters for her business." },
  { id: "carlos", name: "Carlos Mendez",  business: "Mendez Landscaping",  type: "Landscaping",           difficulty: "Medium", mood: "friendly",  emoji: "🌿", personality: "Friendly and casual. Would love more customers but worried about who maintains the site. Very budget-conscious." },
  { id: "sandra", name: "Sandra Holt",    business: "Holt's Bakery",       type: "Bakery owner",          difficulty: "Easy",   mood: "excited",   emoji: "🍰", personality: "Warm and enthusiastic. Has wanted a website for months. Excited about showing cakes and taking orders online." },
];

const MOOD_COLORS = {
  rushed: "#f59e0b", warm: "#10b981", suspicious: "#ef4444",
  neutral: "#94a3b8", friendly: "#3b82f6", dismissive: "#a855f7",
  curious: "#06b6d4", excited: "#ec4899",
};

const SYSTEM_PROMPT = `You are roleplaying as a local small business owner receiving a cold call. The salesperson is trying to sell you a professional website or web design services.

Your persona:
Name: {NAME}
Business: {BUSINESS} ({TYPE})
Difficulty: {DIFFICULTY}
Personality: {PERSONALITY}

RULES:
- Stay in character the ENTIRE time. Never break character.
- Keep replies SHORT — 1 to 3 sentences max. You are on the phone.
- Sound like a real person on the phone. Casual, natural speech. No lists or formal language.
- Raise realistic objections: price, timing, already have a website, too busy, skeptical of ROI.
- Never offer to buy unprompted. Make the salesperson earn it.
- Never say you are an AI or that this is a simulation.
- When answering the phone for the first time, just say your name and business name naturally, like a real person answering a business call.`;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Shared AudioContext (required for iOS audio unlock) ───────────────────────
let sharedAudioCtx = null;
function getAudioCtx() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

// Must be called synchronously inside a user gesture (button tap) to unlock iOS audio
function unlockAudio() {
  const ctx = getAudioCtx();
  ctx.resume();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

// US-style phone ring using Web Audio oscillators
function playRingTone() {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioCtx();
      const ringDuration = 1.5;
      const silence = 1.0;
      const numRings = 2;

      for (let i = 0; i < numRings; i++) {
        const t = ctx.currentTime + i * (ringDuration + silence);
        [440, 480].forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
          gain.gain.setValueAtTime(0.25, t + ringDuration - 0.05);
          gain.gain.linearRampToValueAtTime(0, t + ringDuration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + ringDuration);
        });
      }
      setTimeout(resolve, numRings * (ringDuration + silence) * 1000);
    } catch (e) {
      console.error("Ring tone failed:", e);
      setTimeout(resolve, 3000);
    }
  });
}

// ElevenLabs TTS using AudioContext (works on iOS)
async function speakWithElevenLabs(text, voiceId) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": XI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const ctx = getAudioCtx();
  await ctx.resume();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  return new Promise((resolve, reject) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = resolve;
    source.onerror = reject;
    source.start(0);
  });
}

async function askClaude(messages, persona) {
  const system = SYSTEM_PROMPT
    .replace("{NAME}", persona.name)
    .replace("{BUSINESS}", persona.business)
    .replace("{TYPE}", persona.type)
    .replace("{DIFFICULTY}", persona.difficulty)
    .replace("{PERSONALITY}", persona.personality);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Yeah, hello?";
}

async function getFeedback(messages, persona) {
  const transcript = messages
    .filter((m) => !m.content.startsWith("("))
    .map((m) => `${m.role === "user" ? "Salesperson" : persona.name}: ${m.content}`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are an expert sales coach for web design sales to small businesses.

Transcript of a practice call with ${persona.name}, owner of ${persona.business} (Difficulty: ${persona.difficulty}):

${transcript}

Give structured coaching feedback:
1. **Score** (1–10) + one-line verdict
2. **What They Did Well** (2–3 specific things from the call)
3. **What Needs Work** (2–3 specific things with examples)
4. **Missed Opportunities**
5. **One Power Tip** for next time

Be honest, specific, and encouraging. Reference actual lines from the call.`,
        },
      ],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Could not generate feedback.";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function App() {
  const [persona] = useState(() => getRandom(PERSONAS));
  const [phase, setPhase] = useState("intro");
  // intro | calling | prospectTalking | active | listening | ended
  const [statusText, setStatusText] = useState("");
  const [callLog, setCallLog] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const messagesRef = useRef([]);
  const recognitionRef = useRef(null);

  const moodColor = MOOD_COLORS[persona.mood] || "#6b7280";
  const voiceId = VOICE_IDS[persona.id];

  // Speak with ElevenLabs then move to active
  const prospectSpeak = useCallback(
    async (text) => {
      setPhase("prospectTalking");
      setStatusText(`${persona.name} is talking...`);
      setCallLog((l) => [...l, { who: "them", text }]);
      try {
        await speakWithElevenLabs(text, voiceId);
      } catch (e) {
        console.error("TTS failed:", e);
      }
      setPhase("active");
      setStatusText("Hold mic button to speak");
    },
    [persona, voiceId]
  );

  // Start the call
  const startCall = async () => {
    unlockAudio(); // Must be synchronous — unlocks iOS audio before any awaits
    setPhase("calling");
    setStatusText("Calling...");
    await playRingTone();
    setStatusText("Connected — waiting for answer...");
    const opening = [{ role: "user", content: "(Your phone rings. You answer it.)" }];
    messagesRef.current = opening;
    const reply = await askClaude(opening, persona);
    messagesRef.current = [...opening, { role: "assistant", content: reply }];
    await prospectSpeak(reply);
  };

  // Push-to-talk
  const startListening = () => {
    if (phase !== "active") return;
    unlockAudio(); // Re-unlock in case iOS needs it again
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported. Please use Safari on iPhone or Chrome on Android.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
    setPhase("listening");
    setStatusText("Listening...");

    rec.onresult = async (e) => {
      const said = e.results[0][0].transcript;
      setCallLog((l) => [...l, { who: "me", text: said }]);
      const newMsgs = [...messagesRef.current, { role: "user", content: said }];
      messagesRef.current = newMsgs;
      setPhase("prospectTalking");
      setStatusText(`${persona.name} is thinking...`);
      const reply = await askClaude(newMsgs, persona);
      messagesRef.current = [...newMsgs, { role: "assistant", content: reply }];
      await prospectSpeak(reply);
    };

    rec.onerror = (e) => {
      console.error("STT error:", e.error);
      setPhase("active");
      setStatusText("Hold mic button to speak");
    };

    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  // End call and get feedback
  const endCall = async () => {
    recognitionRef.current?.stop();
    setPhase("ended");
    setFeedbackLoading(true);
    const fb = await getFeedback(messagesRef.current, persona);
    setFeedback(fb);
    setFeedbackLoading(false);
  };

  const isTalking = phase === "prospectTalking" || phase === "calling";
  const isActive = phase === "active";
  const isListening = phase === "listening";
  const isEnded = phase === "ended";

  return (
    <div style={{
      background: "#080808", minHeight: "100vh", color: "#f0ece4",
      fontFamily: "Georgia, serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 16px", boxSizing: "border-box",
    }}>
      {/* Avatar */}
      <div style={{
        width: 110, height: 110, borderRadius: "50%",
        background: `radial-gradient(circle, ${moodColor}44, #111)`,
        border: `2px solid ${moodColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, marginBottom: 16,
        boxShadow: isTalking ? `0 0 44px ${moodColor}99` : "none",
        transition: "box-shadow 0.4s",
      }}>
        {persona.emoji}
      </div>

      {/* Name + tags */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {phase === "intro" ? "Your Next Prospect" : persona.name}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
          {persona.business}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ background: `${moodColor}22`, color: moodColor, borderRadius: 20, padding: "3px 12px", fontSize: 11 }}>
            {persona.mood}
          </span>
          <span style={{ background: "#1a1a1a", color: "#6b7280", borderRadius: 20, padding: "3px 12px", fontSize: 11 }}>
            {persona.difficulty} difficulty
          </span>
        </div>
      </div>

      {/* Status bar */}
      {!isEnded && phase !== "intro" && (
        <div style={{ margin: "20px 0 4px", fontSize: 14, color: moodColor, minHeight: 22, textAlign: "center", letterSpacing: 0.3 }}>
          {statusText}
        </div>
      )}

      {/* ── INTRO ── */}
      {phase === "intro" && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p style={{ color: "#4b5563", maxWidth: 290, lineHeight: 1.8, fontSize: 14, marginBottom: 36 }}>
            A random local business owner will answer. Hold the mic to speak, release to send. They'll respond in a real human voice.
          </p>
          <button onClick={startCall} style={{
            background: "#16a34a", color: "#fff", border: "none",
            borderRadius: 50, padding: "18px 54px", fontSize: 18,
            cursor: "pointer", boxShadow: "0 0 30px #16a34a66",
            fontFamily: "Georgia, serif", letterSpacing: 0.3,
          }}>
            📞 Start Call
          </button>
        </div>
      )}

      {/* ── ACTIVE CALL ── */}
      {!isEnded && phase !== "intro" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, marginTop: 28 }}>
          {/* Mic button */}
          <button
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            disabled={!isActive}
            style={{
              width: 100, height: 100, borderRadius: "50%",
              background: isListening ? "#dc2626" : isActive ? "#1d4ed8" : "#111",
              border: `3px solid ${isListening ? "#ef4444" : isActive ? "#3b82f6" : "#1f2937"}`,
              fontSize: 36, color: "#fff",
              cursor: isActive ? "pointer" : "not-allowed",
              boxShadow: isListening ? "0 0 48px #dc262699" : isActive ? "0 0 24px #1d4ed866" : "none",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitUserSelect: "none", userSelect: "none", touchAction: "none",
            }}
          >
            {isListening ? "🔴" : "🎙️"}
          </button>

          <div style={{ fontSize: 12, color: "#374151", textAlign: "center", minHeight: 18 }}>
            {isListening ? "Release to send" : isActive ? "Hold to speak" : ""}
          </div>

          <button onClick={endCall} style={{
            background: "transparent", color: "#6b7280",
            border: "1px solid #1f2937", borderRadius: 8,
            padding: "10px 28px", fontSize: 13, cursor: "pointer",
            fontFamily: "Georgia, serif",
          }}>
            🔚 End Call & Get Feedback
          </button>
        </div>
      )}

      {/* ── CALL LOG ── */}
      {callLog.length > 0 && !isEnded && (
        <div style={{ width: "100%", maxWidth: 520, marginTop: 36 }}>
          <div style={{ fontSize: 9, color: "#1f2937", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            Call Log
          </div>
          {callLog.slice(-5).map((l, i) => (
            <div key={i} style={{
              fontSize: 12,
              color: l.who === "me" ? "#60a5fa" : "#4b5563",
              marginBottom: 6, padding: "7px 12px",
              background: "#0f0f0f", borderRadius: 6,
              borderLeft: `2px solid ${l.who === "me" ? "#1d4ed8" : moodColor}55`,
            }}>
              <span style={{ opacity: 0.5, marginRight: 6 }}>
                {l.who === "me" ? "You:" : `${persona.name}:`}
              </span>
              {l.text}
            </div>
          ))}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {isEnded && (
        <div style={{ width: "100%", maxWidth: 580, marginTop: 28 }}>
          <div style={{
            background: "#0a160a", border: "1px solid #14532d55",
            borderRadius: 12, padding: 22,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#16a34a", textTransform: "uppercase", marginBottom: 14 }}>
              🎯 Coach Feedback
            </div>
            {feedbackLoading ? (
              <div style={{ color: "#374151", fontSize: 14 }}>Reviewing your call...</div>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.95, color: "#bbf7d0", whiteSpace: "pre-wrap" }}>
                {feedback}
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#111", color: "#e8e0d4",
                border: "1px solid #2a2a2a", borderRadius: 8,
                padding: "13px 40px", fontSize: 15, cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              🔄 New Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
