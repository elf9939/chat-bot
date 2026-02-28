# Sales Practice Bot

A voice-powered AI sales call simulator. Practice pitching web design services to realistic local business owner personas — they respond in real human voices via ElevenLabs.

## Setup

### 1. Clone & install
```bash
git clone <your-repo-url>
cd sales-practice-bot
npm install
```

### 2. Add environment variables
Create a `.env` file in the root:
```
REACT_APP_ELEVENLABS_KEY=your_elevenlabs_key_here
REACT_APP_ANTHROPIC_KEY=your_anthropic_key_here
```

### 3. Run locally
```bash
npm start
```

### 4. Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add both env variables in **Vercel → Settings → Environment Variables**:
   - `REACT_APP_ELEVENLABS_KEY`
   - `REACT_APP_ANTHROPIC_KEY`
4. Deploy — open the URL on your iPhone in Safari

## How to use
1. Hit **Start Call** — a random prospect answers
2. **Hold the mic button** to speak, release to send
3. They respond in a real voice
4. Hit **End Call** for detailed coach feedback
5. Hit **New Call** for a different prospect

## Prospects
- 🍕 Tony Rizzo — Tony's Pizza (Medium)
- 💇 Karen Bloom — Bloom Hair Studio (Easy)
- 🔧 Derek Stone — Stone's Auto Repair (Hard)
- 🧹 Maria Gonzalez — Maria's Cleaning (Medium)
- ✂️ James Okafor — Okafor's Barbershop (Medium)
- 👔 Linda Park — Park's Dry Cleaning (Hard)
- 🌿 Carlos Mendez — Mendez Landscaping (Medium)
- 🍰 Sandra Holt — Holt's Bakery (Easy)
# force rebuild
