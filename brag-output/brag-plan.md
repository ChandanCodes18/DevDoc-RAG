# Brag Plan: DevDocs AI

## What is this app?
DevDocs AI is a RAG-powered chat assistant that ingests any codebase — via ZIP upload or GitHub URL — and lets you ask it natural-language questions, getting back markdown-formatted answers with syntax-highlighted code.

## The angle
You drop a GitHub repo in. You ask it anything. It answers with real code.
No setup. No local indexing. No digging through files. Just ask.
The hook is the audacity of the simplicity.

## Hook (first 2-3 seconds)
Black screen. Three words appear in glowing indigo-white gradient type:

> **"Ask your codebase."**

Slow fade-in, then the orb pulses softly. Cut.

## Key moments (the middle)
- **Repo import moment:** GitHub URL gets pasted into the import field → "Import" button clicked → bot confirms "Successfully imported Github Repository!"
- **The question:** User types "How does the file upload work?" into the chat bar. The indigo gradient bubble fires to the right.
- **The answer:** Bot response bubbles in on the left — a code block with function signatures, Markdown neatly rendered, orb glowing steady.

## Outro / punchline
Logo pill "DevDocs AI" pulses once in the center.
Below it, calm white text: **"Drop your repo. Talk to your code."**
Hold 2 seconds. Fade.

## User flow worth showing
1. **Entry:** Paste a GitHub URL into the attach popup → click Import → confirmation message appears
2. **Key action:** Type a natural-language question in the chat bar → hit send
3. **Result:** A beautiful markdown + code block response renders in the bot bubble

## Tone
- Preset: `default`
- Creative direction: *drop your repo, talk to your code — calm confidence, not startup hype*
- Interpretation: Pacing is comfortable but deliberate. Typography is clean. Motion is purposeful, never frantic. The product speaks for itself — no superlatives, just demonstration.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: `#05070a` (obsidian)
- Accent / brand: `#4f46e5` to `#7c3aed` (indigo to violet gradient)
- Text primary: `#f3f4f6`
- Text secondary: `#94a3b8`
- User bubble: `linear-gradient(135deg, #4f46e5, #7c3aed)`
- Bot bubble: `rgba(255,255,255,0.05)` glass with subtle border
- Display font: Outfit (Google Fonts)
- Body font: Outfit
- Strongest visual element: The chat interface — obsidian background, indigo gradient user bubble on the right, glass bot bubble with syntax-highlighted code on the left, animated orb avatar

## Share copy (draft)
"Drop a GitHub repo. Ask it anything. Get real answers with code. Meet DevDocs AI."

## Audio direction
- Role: Warm electronic bed; subtle UI SFX at key interaction moments
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: Fade in from 0s at volume 0.32; gentle fade-out starting at 18s; no hard cut
- Music cue guidance: Bundled preset available. Strong cues at 4.23s, 6.34s, 10.54s, 12.65s. Target 4.23s for import popup reveal; target 10.54s for send; target 12.65s for answer arrival. Beat grid ~0.52s intervals (114.84 BPM).
- Audio-reactive treatment: Subtle — use music RMS/bass to make the orb glow breathe and the bot bubble glass presence shift gently. No waveform/equalizer visuals.
- SFX posture: Moderate — 4-5 well-timed cues. Motion-matched. Professional restraint.
- Audio-coupled moments:
  - Import button click — interface/click_001.ogg
  - Bot confirmation message arrival — interface/drop_001.ogg
  - Send button tap — interface/click_002.ogg
  - Code block rendering arrival — impact/impactBell_heavy_000.ogg (soft, one ring)
  - Outro logo pulse — interface/bong_001.ogg
- Restraint rule: Music must not overwhelm. SFX should feel like the app, not a sound design demo.

---

## Storyboard

### Scene 1 — Hook — 3s
What's on screen: Pure obsidian #05070a. The text "Ask your codebase." fades in centered in a warm white-to-indigo gradient. Below it, the orb materializes gently and pulses once.
Text: "Ask your codebase."
Sequential/interaction: No — single text reveal, single orb fade-in
Audio intent: Set the mood — calm, intentional, intriguing
Audio-coupled idea: Text fades in with a single soft interface/drop_001 as it settles; orb appearance is silent
Music: Warm electronic bed starting from 0s, low volume
Transition mood: clean crossfade to Scene 2

### Scene 2 — Import — 4s
What's on screen: Recreate the attach popup open state. The GitHub input field shows a URL being typed. The "Import" button is clicked. Then in the chat area, the bot bubble appears: "Successfully imported Github Repository !"
Text: GitHub URL in field, Import button, "Successfully imported Github Repository !"
Sequential/interaction: Yes — typing in field (a few keypress ticks), button click, then bot confirmation bubble slides in
Audio intent: Feels like the real app — casual but satisfying
Audio-coupled idea: keyboard/keypress-*.wav ticks during typing, interface/click_002.ogg on Import, interface/drop_001.ogg when confirmation arrives
Music: Continuing bed — beat-lock import confirmation to ~4.23s strong cue
Transition mood: clean cut to Scene 3

### Scene 3 — The Question — 4s
What's on screen: The main chat interface. The input bar is focused, glowing violet-purple. The user types "How does the file upload work?". The indigo-to-violet gradient bubble fires right. Orb on the left begins its loading pulse.
Text: "How does the file upload work?" in user bubble
Sequential/interaction: Yes — text types in, send button lights up, bubble fires right, orb starts pulsing (loading state)
Audio intent: A beat of anticipation — the question hangs in the air
Audio-coupled idea: ui/mouseclick1.ogg when send fires — beat-locked to ~10.54s strong cue
Music: Music building slightly
Transition mood: clean cut to Scene 4

### Scene 4 — The Answer — 6s
What's on screen: The bot bubble arrives. A markdown response renders — bold text, then a code block with syntax highlighting showing a real snippet from the codebase. The orb glows steady and small.
Text: "The upload uses a multipart POST to /api/upload/zip." then code block with handleFileUpload snippet
Sequential/interaction: Yes — markdown text fades in first, code block slides in one beat later
Audio intent: The payoff. Satisfying. Quiet confidence.
Audio-coupled idea: impact/impactBell_heavy_000.ogg (soft, once) as code block finishes — beat-locked to ~12.65s strong cue
Music: Gentle fade toward outro
Transition mood: slow crossfade to Scene 5

### Scene 5 — Outro — 3s
What's on screen: Obsidian black. The "DevDocs AI" pill logo appears centered with a subtle indigo halo. Below it: "Drop your repo. Talk to your code." Hold. Fade to black.
Text: "DevDocs AI" pill + "Drop your repo. Talk to your code."
Sequential/interaction: Pill pulses in first, tagline fades in 0.6s later
Audio intent: Settled. The logo lands.
Audio-coupled idea: interface/bong_001.ogg on the logo pulse
Music: Fade out by end of scene
Transition mood: fade to black

**Total duration: 3 + 4 + 4 + 6 + 3 = 20 seconds**

**Music mood for this video:** Mid-energy, warm electronic — confident without being hype
**Audio summary:** Music bed opens calm, builds slightly into the question moment, peaks softly at the code reveal, then fades into the logo outro.

## Music cue guidance
- Track: happy-beats-business-moves-vol-9-by-ende-dot-app.mp3 (114.84 BPM)
- Strong cue targets:
  - 4.23s — Import confirmation arrival (Scene 2 climax)
  - 10.54s — Send button fires / user bubble appears (Scene 3)
  - 12.65s — Code block renders / impactBell rings (Scene 4)
- Beat grid: ~0.52s intervals; use for keypress ticks in Scene 2
- Restraint note: Calm-confidence tone — lock only the 3 major moments; let natural timing govern everything else.
