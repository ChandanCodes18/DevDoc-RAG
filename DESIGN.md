# Design System & UI Specifications

> Log updated on: 2026-10-02
> This file tracks the design system implementation for the "Synapse" UI redesign phase.

## Theme: "Synapse" Dark SaaS
Today's updates shifted the application from a generic dark mode to a premium, developer-focused "Synapse" aesthetic.

| Token             | Hex       | Usage                |
|-------------------|-----------|----------------------|
| `--bg-base`       | `#0b0e14` | Deepest background layer |
| `--bg-panel`      | `#0f1420` | Sidebar, main background |
| `--bg-surface`    | `#141927` | Cards, message bubbles   |
| `--bg-elevated`   | `#1a2133` | Hover states, code bg header |
| `--accent`        | `#3D82F7` | Synapse Blue (CTAs, borders, glows) |

## UI Components Created/Updated Today

### Bot Avatar Design (Dev Terminal)
- **Concept:** Dev Terminal Prompt (`>_`).
- **Styling:** Transparent background, completely removing the heavy blue circular fill. The icon inherits the accent color to contrast crisply against the dark application background.
- **Animations:**
  - **Blinking Cursor:** The underscore (`_`) has a 1-second `step-end` infinite blink animation applied via CSS, mimicking a genuine terminal prompt (`.terminal-cursor { animation: terminal-blink 1s step-end infinite; }`).
  - **Active State Logic:** The blinking cursor is strictly applied *only* to the currently generating/loading avatar, and the very last bot message in the active chat (waiting for input). Past historical messages are rendered as a completely static `>_`.
  - **Loading Pulse:** During active processing (`isLoading`), the avatar emits a soft pulsing drop-shadow (`drop-shadow(rgba(61,130,247,0.6))`) and smoothly translates on the Y-axis.

### Custom Modals (CustomDialog)
- Replaced native alerts (`prompt()` and `confirm()`) with Framer Motion animated cards.
- **Style:** `16px` border-radius, dark surface background, subtle inner borders (`var(--border-mid)`), and heavy drop shadows (`0 16px 48px rgba(0,0,0,0.5)`) for z-axis depth.
- **Behavior:** Animated overlay using `<AnimatePresence>` for smooth entry (`scale: 0.95`, `y: 10`) and exit.

### Layout Restructure
- Moved `UploadPanel` out of the chat conditional logic into a global overlay state so the "Attach" button works on the Welcome Screen.
- **Typography:** Maintained Geist/Geist Mono stack for maximum legibility in dense code environments.
