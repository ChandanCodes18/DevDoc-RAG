# Hyperframes Composition Brief: DevDocs AI

## Objective
Create a 20-second launch-style brag video for DevDocs AI — a RAG-powered chat assistant that ingests GitHub repos and answers natural-language questions about code.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `c:/Web Dev/Projects/DevDoc-RAG/`
- Primary files read: `client/src/App.jsx`, `client/src/index.css`
- Product name: DevDocs AI
- Tagline / strongest claim: "Drop your repo. Talk to your code."
- Key UI or visual moment to recreate: The full chat interface — GitHub import popup, user message bubble (indigo-violet gradient), bot glass bubble with rendered markdown + syntax-highlighted code block, animated orb avatar
- Copy that must appear verbatim:
  - "Ask your codebase."
  - "Successfully imported Github Repository !"
  - "How does the file upload work?"
  - "Drop your repo. Talk to your code."
  - "DevDocs AI"

## Creative Direction
- Tone preset: `default`
- Creative direction: *drop your repo, talk to your code — calm confidence, not startup hype*
- Interpretation: Comfortable pacing, deliberate motion. Outfit font, clean obsidian background. Product demonstrates itself — no superlatives, no abstract filler. Every text element holds long enough to read.
- Angle: The app's audacity is its simplicity — you drop a repo in and ask it anything. The video shows that exact flow.
- Hook: "Ask your codebase." text fades in on obsidian, orb pulses below
- Outro / punchline: "DevDocs AI" pill logo + "Drop your repo. Talk to your code." on black
- Avoid:
  - Generic SaaS language ("streamline your workflow", "empower your team")
  - Abstract color washes or generic motion graphics
  - Any visual redesign that departs from the app's obsidian + indigo/violet palette

## Visual Identity
- Background: `#05070a` (obsidian black)
- Text primary: `#f3f4f6`
- Text secondary: `#94a3b8`
- Accent: `linear-gradient(135deg, #4f46e5, #7c3aed)` (indigo → violet)
- User bubble: `linear-gradient(135deg, #4f46e5, #7c3aed)`, border-radius 18px, bottom-right-radius 4px, white text
- Bot bubble: `rgba(255,255,255,0.05)` glass, `border: 1px solid rgba(255,255,255,0.08)`, backdrop-filter blur(8px), border-radius 18px, bottom-left-radius 4px, `#f3f4f6` text
- Input bar: `rgba(255,255,255,0.05)` glass, border `rgba(255,255,255,0.12)`, border-radius 28px, backdrop-filter blur(20px); focus glow: `rgba(139,92,246,0.6)` border + `rgba(139,92,246,0.25)` shadow
- Display font: Outfit (Google Fonts), weights 400-700
- Body font: Outfit
- Visual references: indigo send button (36px circle, same gradient), "+" attach button (36px circle, transparent/glass), pill header "DevDocs AI" with frosted glass background

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3s — "Ask your codebase." text centered on obsidian + orb pulse below
2. Import — 4s — GitHub import popup, URL typed, Import clicked, bot confirmation arrives
3. The Question — 4s — Chat input focused, "How does the file upload work?" typed and sent, orb starts loading pulse
4. The Answer — 6s — Bot bubble arrives with markdown text + syntax-highlighted code block, orb glows steady
5. Outro — 3s — "DevDocs AI" pill logo + tagline on black, fade out

## Audio
- Audio role: Warm electronic bed with tasteful UI SFX at interaction moments
- Audio arc: Opens calm → builds slightly at Scene 3 → peaks softly at Scene 4 code reveal → fades out through outro
- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: Start at 0s, volume 0.32. Gentle fade-out starting ~18s. No hard cut.
- Music cue guidance: Bundled preset at `assets/music/cues/happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json`. Strong cues to target: 4.23s (import confirmation), 10.54s (send button fires), 12.65s (code block appears). Beat grid ~0.52s intervals at 114.84 BPM.
- Audio-reactive treatment: Subtle — use music RMS/bass to make the orb glow breathe and the bot bubble glass presence shift gently. No waveform/equalizer visuals, no strobing, no heavy pulsing.
- Audio-coupled moments:
  - Scene 2, URL field typing — keyboard/keypress-*.wav (randomized, a few ticks, not every char)
  - Scene 2, Import button click — interface/click_002.ogg
  - Scene 2, bot confirmation arrives — interface/drop_001.ogg (~4.23s beat-lock)
  - Scene 3, send button fires — ui/mouseclick1.ogg (~10.54s beat-lock)
  - Scene 4, code block finishes rendering — impact/impactBell_heavy_000.ogg, soft (~12.65s beat-lock)
  - Scene 5, logo pill pulse — interface/bong_001.ogg
- SFX selection guidance: Prefer clean, restrained interface sounds. The app is polished and dark-themed — no aggressive or comedic SFX. All SFX at 0.60-0.75 volume. The bell ring at Scene 4 should feel like a quiet achievement, not an alarm.
- SFX analysis guidance: `c:/Web Dev/Projects/DevDoc-RAG/.agent/skills/brag/assets/sfx/sfx-analysis.md` — prefer low/medium HF-risk files; `impactBell_heavy_000` is the exception for the code-reveal payoff.
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy the chosen music and any selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli` — to create the composition in `brag-output/composition/`. /brag is its own workflow: do not enter the hyperframes entry-point intent interview and do not route into the generic promo/launch-video workflow.

Requirements:
- Show the actual DevDocs AI chat UI (recreated in HTML): the input bar, the user message bubble (indigo gradient), the bot glass bubble with markdown + code block, and the orb avatar.
- Keep all text readable — no flash-text. Every readable line must hold at its reading-time floor.
- Keep total duration 20 seconds.
- Include the music and SFX layer as planned.
- Honor the 3 strong beat-lock moments (4.23s, 10.54s, 12.65s) — shift reveals ±0.15s to hit them.
- Apply a subtle audio-reactive treatment to the orb glow using RMS/bass data.
- Run `npx hyperframes check` before render — zero errors required.
