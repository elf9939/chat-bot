import { useState, useRef, useCallback } from "react";

// ── API keys from environment variables ─────────────────────────────────────
const XI_KEY = process.env.REACT_APP_ELEVENLABS_KEY;
const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

// ── ElevenLabs voice IDs ─────────────────────────────────────────────────────
const VOICE_IDS = {
  mike:  "TxGEqnHWrfWFTfGW9XjX", // Josh  — warm
  dave:  "N2lVS1w4EtoT3dr4eOWO", // Callum — casual
  rick:  "VR6AewLTigWG4xSOukaG", // Arnold — gruff
  bill:  "onwK4e9ZLuTAKqWW03F9", // Daniel — flat/dismissive
  jeff:  "TxGEqnHWrfWFTfGW9XjX", // Josh  — analytical
  tom:   "N2lVS1w4EtoT3dr4eOWO", // Callum — friendly
  steve: "VR6AewLTigWG4xSOukaG", // Arnold — hostile
  ray:   "onwK4e9ZLuTAKqWW03F9", // Daniel — cautious
};

// ── Personas ─────────────────────────────────────────────────────────────────
const PERSONAS = [
  { id: "mike", name: "Mike Harmon", business: "Harmon Roofing", type: "Roofing contractor", difficulty: "Easy", mood: "warm", emoji: "🏠",
    personality: `Friendly, straightforward guy. Hates the Angi/HomeAdvisor lead game — 'I pay forty bucks a lead and half of 'em are tire kickers.' Open to better options but mildly skeptical. Warms up fast if you mention exclusive leads or showing up on Google when someone searches for a roofer nearby. Asks 'so how's this different from the lead sites?' early on.` },
  { id: "dave", name: "Dave Kowalski", business: "Kowalski Roofing", type: "Roofing contractor", difficulty: "Medium", mood: "rushed", emoji: "🔨",
    personality: `Always in the middle of something — on a roof, in the truck, measuring a job. Talks fast, cuts people off. Says 'yep', 'got it', 'okay' a lot but isn't really listening until you say something that stops him. Gives you about 60 seconds before he says he has to go. Hook him fast with a specific dollar amount or a local competitor example. Says 'I dunno man, I stay pretty busy' when skeptical.` },
  { id: "rick", name: "Rick Tanner", business: "Tanner Roofing & Gutters", type: "Roofing contractor", difficulty: "Hard", mood: "suspicious", emoji: "🛠️",
    personality: `Got burned twice — paid a web company $1,500, they disappeared. Paid another $800 for 'SEO', nothing happened. Deeply distrustful of anyone selling web stuff. Short answers, long silences. Says 'yeah I've heard that before' and 'prove it' a lot. Will NOT engage unless you acknowledge his past experiences without getting defensive. Respects brutal honesty — if you're too smooth he'll say 'you sound like the last two guys' and shut down. Hang up threshold: medium — will bail if you don't acknowledge his skepticism within the first couple exchanges.` },
  { id: "bill", name: "Bill Santos", business: "Santos Roofing Inc", type: "Roofing contractor", difficulty: "Hard", mood: "dismissive", emoji: "📵",
    personality: `22 years in business, fully booked on referrals. 'I don't need more work, I need less.' Extremely terse — one or two sentence answers. Does not believe websites do anything for roofers. Has heard every pitch. Gets annoyed fast. His one soft spot: his son Danny just joined the business and Bill worries about what happens when he's not around to hand off clients. If you find that nerve, he'll pause. Otherwise he WILL hang up — his hang up threshold is very low, he'll bail after 2 pushes if you haven't connected. Very likely to hang up.` },
  { id: "jeff", name: "Jeff Greer", business: "Greer Roofing Solutions", type: "Roofing contractor", difficulty: "Medium", mood: "curious", emoji: "🔍",
    personality: `Smart, runs a tight operation. Has a basic website but it hasn't generated a single call in two years. Skeptical but genuinely curious about why it's not working. Asks specific questions: 'what's a realistic timeline to rank?', 'what's my cost per lead?', 'do I own the site or are you renting it to me?' Responds well to honesty and specifics. Will catch you if you're vague or use buzzwords. Wants to understand before he commits.` },
  { id: "tom", name: "Tom Walsh", business: "Walsh & Sons Roofing", type: "Roofing contractor", difficulty: "Easy", mood: "friendly", emoji: "👷",
    personality: `Easy-going, family operation with his two sons. His youngest 'handles the Facebook' but Tom knows they're leaving money on the table. Jokes around, easy to keep talking, loves to go off on tangents about jobs they've done. Gets genuinely interested but is easily distracted and forgets to make decisions. Needs a direct close — if you let the conversation drift he'll wrap up with 'sounds good, I'll think about it' and hang up.` },
  { id: "steve", name: "Steve Drummond", business: "Drummond Roofing", type: "Roofing contractor", difficulty: "Hard", mood: "hostile", emoji: "🚫",
    personality: `Hates cold calls with a passion. Gets five of these a day. Answers with barely concealed irritation — 'let me guess, website?' Extremely low patience. Will hang up fast unless something genuinely surprises him. The ONLY things that work: brutal directness ('I'll be straight with you, most of these calls are garbage, this one might be different'), calling out his frustration head-on, or saying something hyper-specific about his market. If you sound scripted AT ALL, he's gone. Very likely to hang up within 1-2 exchanges.` },
  { id: "ray", name: "Ray Munoz", business: "Munoz Roofing Co", type: "Roofing contractor", difficulty: "Medium", mood: "cautious", emoji: "🤔",
    personality: `Thoughtful, cautious with money. Just came off a slow season and is watching every dollar. Asks 'what's this gonna run me?' in the first minute. Not opposed to a website but needs to see clear ROI before he'll spend anything. Will bring cost back up every few exchanges even when interested. Warms up noticeably if you give him a real number and explain what he gets — he hates vague pricing more than anything.` },
];

const MOOD_COLORS = {
  rushed: "#f59e0b", warm: "#10b981", suspicious: "#ef4444",
  neutral: "#94a3b8", friendly: "#3b82f6", dismissive: "#a855f7",
  curious: "#06b6d4", excited: "#ec4899", hostile: "#dc2626", cautious: "#d97706",
};

const SYSTEM_PROMPT = `You are roleplaying as {NAME}, owner of {BUSINESS}, a roofing contractor. A salesperson just cold-called you trying to sell a website or web design services.

Your personality: {PERSONALITY}

RULES — follow these exactly:
- You are a real person on the phone. Never break character. Never mention AI or simulation.
- Keep EVERY reply to 1–3 short sentences. You're busy and on the phone.
- Use casual, natural speech. Contractions, filler words, interrupted thoughts — like a real person talking.
- React directly to what the salesperson just said. Reference their actual words.
- Show your personality in every response — your specific speech patterns, concerns, and attitude.
- Raise objections naturally as the conversation progresses: cost, time, skepticism, don't need it, etc.
- NEVER volunteer to buy. Make them earn it. But reward good salesmanship with genuine interest.
- When you first answer: say your name and business name the way you'd naturally answer your phone.
- NEVER use stage directions, asterisks, or action descriptions. Spoken words only.
- HANGING UP: If the salesperson is repetitive, too pushy, won't take a hint, uses buzzwords without substance, or you've run out of patience per your personality, end the call with a short dismissal AND append [HANGUP] on its own at the very end (e.g. "Look, I gotta go, not interested." followed by [HANGUP]). Easy personalities almost never hang up. Medium hang up only after being pushed hard 2+ times with no value. Hard personalities may hang up within 1-2 exchanges if the opener is weak or generic.`;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Audio unlock (iOS Safari requires this on first user tap) ────────────────
let sharedAudioCtx = null;
let persistentAudio = null; // reused Audio element — iOS trusts it after first play

function getAudioCtx() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

// Call synchronously inside a tap handler to unlock both audio systems on iOS
function unlockAudio() {
  // Unlock Web Audio API (for ring tone)
  const ctx = getAudioCtx();
  ctx.resume();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);

  // Unlock HTML Audio element (for ElevenLabs speech)
  // A silent WAV played in the gesture "trusts" the element for future async plays
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    persistentAudio.play().catch(() => {});
  }
}

// US-style phone ring using Web Audio oscillators
function playRingTone() {
  return new Promise(async (resolve) => {
    try {
      const ctx = getAudioCtx();
      await ctx.resume();
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

// Strip stage directions and clean punctuation before sending to TTS
function cleanForSpeech(text) {
  return text
    .replace(/\*[^*]*\*/g, "")   // remove *stage directions*
    .replace(/—/g, ", ")          // em-dash → natural pause
    .replace(/\s+/g, " ")         // collapse extra spaces
    .trim();
}

// ElevenLabs TTS — uses the persistent Audio element so iOS allows async playback
async function speakWithElevenLabs(text, voiceId) {
  text = cleanForSpeech(text);
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
        model_id: "eleven_v3",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

  const audio = persistentAudio || new Audio();

  // iOS Safari doesn't support MediaSource for audio — fall back to full blob
  const canStream =
    typeof MediaSource !== "undefined" &&
    MediaSource.isTypeSupported("audio/mpeg");

  if (!canStream) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(); };
      audio.src = url;
      audio.load();
      audio.play().catch(reject);
    });
  }

  // MediaSource streaming — playback starts as first chunks arrive
  return new Promise((resolve, reject) => {
    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);

    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Audio error")); };
    audio.src = url;

    mediaSource.addEventListener("sourceopen", async () => {
      let sourceBuffer;
      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      } catch (e) {
        reject(e);
        return;
      }

      const waitForUpdate = () =>
        new Promise((r) => sourceBuffer.addEventListener("updateend", r, { once: true }));

      const reader = res.body.getReader();
      try {
        audio.play().catch(() => {});
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (sourceBuffer.updating) await waitForUpdate();
            mediaSource.endOfStream();
            break;
          }
          if (sourceBuffer.updating) await waitForUpdate();
          sourceBuffer.appendBuffer(value);
        }
      } catch (e) {
        reject(e);
      }
    }, { once: true });

    audio.load();
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system,
      messages,
    }),
  });
  const data = await res.json();
  if (!data.content?.[0]?.text) {
    console.error("Claude API error:", JSON.stringify(data));
  }
  return data.content?.[0]?.text || `[API ERROR: ${data.error?.message || data.type || "unknown"}]`;
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are an expert sales coach specializing in web design sales to local roofing contractors.

Transcript of a practice call with ${persona.name}, owner of ${persona.business} (Difficulty: ${persona.difficulty}):

${transcript}

Give structured coaching feedback:
1. **Score** (1–10) + one-line verdict
2. **What They Did Well** (2–3 specific things from the call)
3. **What Needs Work** (2–3 specific things with examples)
4. **Missed Opportunities** (objections not addressed, hooks not used)
5. **One Power Tip** — the single most important thing to fix for the next call with a roofer

Be honest, direct, and specific to roofing sales. Reference actual lines from the call.`,
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
  const [wasHungUp, setWasHungUp] = useState(false);
  const messagesRef = useRef([]);
  const recognitionRef = useRef(null);

  const moodColor = MOOD_COLORS[persona.mood] || "#6b7280";
  const voiceId = VOICE_IDS[persona.id];

  // Speak with ElevenLabs then move to active (or hang-up state)
  const prospectSpeak = useCallback(
    async (text) => {
      const isHangup = text.includes("[HANGUP]");
      const cleanText = text.replace("[HANGUP]", "").trim();
      setPhase("prospectTalking");
      setStatusText(`${persona.name} is talking...`);
      setCallLog((l) => [...l, { who: "them", text: cleanText }]);
      try {
        await speakWithElevenLabs(cleanText, voiceId);
      } catch (e) {
        console.error("TTS failed:", e);
      }
      if (isHangup) {
        setWasHungUp(true);
        setPhase("ended");
        setFeedbackLoading(true);
        const fb = await getFeedback(messagesRef.current, persona);
        setFeedback(fb);
        setFeedbackLoading(false);
      } else {
        setPhase("active");
        setStatusText("Hold mic button to speak");
      }
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
  const startListening = (e) => {
    if (e) e.preventDefault();
    if (phase !== "active") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported. Please use Safari on iPhone or Chrome on Android.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    recognitionRef.current = rec;
    setPhase("listening");
    setStatusText("Listening...");

    rec.onresult = async (e) => {
      // Stop immediately — prevents duplicate firings with continuous:true
      recognitionRef.current?.stop();
      const said = e.results[e.resultIndex][0].transcript.trim();
      if (!said) return;
      setCallLog((l) => [...l, { who: "me", text: said }]);
      const newMsgs = [...messagesRef.current, { role: "user", content: said }];
      messagesRef.current = newMsgs;
      setPhase("prospectTalking");
      setStatusText(`${persona.name} is thinking...`);
      const reply = await askClaude(newMsgs, persona);
      // Store clean reply (strip hang-up signal) in message history
      const cleanReply = reply.replace("[HANGUP]", "").trim();
      messagesRef.current = [...newMsgs, { role: "assistant", content: cleanReply }];
      await prospectSpeak(reply);
    };

    // Fires when recognition ends — reset if nothing was captured
    rec.onend = () => {
      setPhase((cur) => (cur === "listening" ? "active" : cur));
      setStatusText((cur) =>
        cur === "Listening..." || cur === "Processing..."
          ? "Hold mic button to speak"
          : cur
      );
    };

    rec.onerror = (e) => {
      console.error("STT error:", e.error);
      setPhase("active");
      setStatusText("Hold mic button to speak");
    };

    rec.start();
  };

  const stopListening = (e) => {
    if (e) e.preventDefault();
    if (!recognitionRef.current) return;
    setStatusText("Processing...");
    recognitionRef.current.stop();
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
            A random local roofer will answer. Hold the mic to speak, release to send. Some prospects hang up — earn their attention fast.
          </p>
          <button onPointerDown={unlockAudio} onClick={startCall} style={{
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
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onMouseLeave={stopListening}
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
          {wasHungUp && (
            <div style={{
              background: "#1a0a0a", border: "1px solid #7f1d1d",
              borderRadius: 8, padding: "12px 18px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>📵</span>
              <div>
                <div style={{ color: "#f87171", fontWeight: 600, fontSize: 14 }}>They hung up</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{persona.name} ended the call — here's what happened</div>
              </div>
            </div>
          )}
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
