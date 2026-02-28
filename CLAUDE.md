# 🤖 Claude / Cursor Notes
# Sales Practice Bot — Developer Handoff

This file is for Claude in Cursor. Read this before making any changes to the project.

---

## What This App Does

A voice-powered AI sales call simulator. The user practices pitching web design services
to randomly selected local business owner personas. The prospect responds in a real human
voice (ElevenLabs TTS). The user speaks back using their phone mic (Web Speech API).
At the end of the call, Claude gives detailed sales coaching feedback.

---

## Tech Stack

- **React** (Create React App)
- **ElevenLabs API** — text-to-speech (makes prospects sound human)
- **Anthropic Claude API** — powers prospect responses + end-of-call coaching feedback
- **Web Speech API** — speech-to-text (user's mic input, built into Safari/Chrome)
- **Deployed on Vercel**

---

## File Structure

```
sales-bot/
├── public/
│   └── index.html          # Standard HTML shell
├── src/
│   ├── index.js            # React entry point
│   └── App.js              # Everything lives here — personas, API calls, UI
├── .env.example            # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## Environment Variables

These MUST be set in Vercel (Settings → Environment Variables) and locally in a `.env` file:

```
REACT_APP_ELEVENLABS_KEY=sk_...       # ElevenLabs API key
REACT_APP_ANTHROPIC_KEY=sk-ant-...    # Anthropic API key
```

Never commit `.env` to GitHub. It's already in `.gitignore`.

---

## How the App Flow Works

1. App loads → random persona selected from PERSONAS array
2. User taps "Start Call"
3. App sends opening message to Claude API → gets prospect's reply
4. Reply is sent to ElevenLabs → audio plays (prospect speaks)
5. User holds mic button → Web Speech API listens
6. User releases mic → transcript sent to Claude API → prospect replies → ElevenLabs speaks
7. Repeat until user taps "End Call"
8. Full transcript sent to Claude API for coaching feedback
9. User can tap "New Call" → page reloads → new random persona

---

## Personas (8 total, in App.js)

Each persona has:
- `id` — used to look up their ElevenLabs voice ID
- `name`, `business`, `type`, `difficulty`, `mood`, `emoji`
- `personality` — injected into Claude's system prompt

| ID     | Name          | Business             | Difficulty |
|--------|---------------|----------------------|------------|
| tony   | Tony Rizzo    | Tony's Pizza         | Medium     |
| karen  | Karen Bloom   | Bloom Hair Studio    | Easy       |
| derek  | Derek Stone   | Stone's Auto Repair  | Hard       |
| maria  | Maria Gonzalez| Maria's Cleaning     | Medium     |
| james  | James Okafor  | Okafor's Barbershop  | Medium     |
| linda  | Linda Park    | Park's Dry Cleaning  | Hard       |
| carlos | Carlos Mendez | Mendez Landscaping   | Medium     |
| sandra | Sandra Holt   | Holt's Bakery        | Easy       |

---

## ElevenLabs Voice IDs (in App.js → VOICE_IDS object)

These are mapped by persona ID. If a voice sounds wrong or gets deprecated,
replace the voice ID string. Find new IDs at elevenlabs.io/voice-library.

```js
tony:   "TxGEqnHWrfWFTfGW9XjX"  // Josh
karen:  "EXAVITQu4vr4xnSDxMaL"  // Bella
derek:  "VR6AewLTigWG4xSOukaG"  // Arnold
maria:  "pFZP5JQG7iQjIQuC4Bku"  // Lily
james:  "onwK4e9ZLuTAKqWW03F9"  // Daniel
linda:  "XB0fDUnXU5powFXDhCwa"  // Charlotte
carlos: "N2lVS1w4EtoT3dr4eOWO"  // Callum
sandra: "jsCqWAovK2LkecY7zXl4"  // Gigi
```

---

## Claude API Usage

- **Prospect responses**: `claude-3-5-haiku-20241022`, max_tokens 150 (keep replies short)
- **Coaching feedback**: `claude-3-5-haiku-20241022`, max_tokens 1000
- The system prompt is in `App.js` as `SYSTEM_PROMPT` — edit this to change how prospects behave
- Direct browser access header required: `"anthropic-dangerous-direct-browser-access": "true"`

---

## Known Limitations & Things To Fix

- **Web Speech API on iOS**: Only works in Safari. Does NOT work in Chrome on iPhone.
  Tell users to open in Safari. If mic isn't working, this is almost always why.

- **ElevenLabs CORS**: Works fine from a hosted Vercel URL. May have issues on localhost
  depending on browser. Test on deployed URL first before debugging locally.

- **No conversation memory across sessions**: Each "New Call" is a full page reload.
  If you want persistent history/stats, you'd need to add a backend or localStorage.

- **Single file architecture**: Everything is in App.js. If this grows, consider splitting into:
  - `src/personas.js` — persona data
  - `src/api.js` — ElevenLabs + Anthropic API calls
  - `src/App.js` — UI only

---

## Ideas for Future Features

- [ ] Score tracker across multiple calls (localStorage)
- [ ] Let user choose which persona to call instead of random
- [ ] Difficulty selector before call starts
- [ ] Call timer displayed during the call
- [ ] Replay the prospect's audio after the call
- [ ] Add more personas (dentist, gym owner, plumber, etc.)
- [ ] Add a "hint" button mid-call that whispers a tip to the user
- [ ] PWA support so it installs on iPhone home screen like a real app
- [ ] Backend (Node/Express) to hide API keys server-side instead of env vars

---

## Deployment Checklist

- [ ] Both env vars set in Vercel
- [ ] Tested on Safari iPhone (not Chrome)
- [ ] Volume up + silent mode off on phone
- [ ] ElevenLabs account is on paid plan (API requires it)

---

## Owner Notes

- Built for practicing cold call sales pitches for web design services to local businesses
- The owner uses GitHub + Vercel for deployment
- ElevenLabs Starter plan ($5/month) — API key permissions: Text to Speech (Access) + Voices (Read)
- Anthropic API key from console.anthropic.com
