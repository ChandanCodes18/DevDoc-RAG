# Architectural & Product Decisions

## State Management Restructure (Multi-Session Support)
- **Problem:** Chat history was previously stored in a single global `messages` array, causing all projects and chats to display the exact same content when switching tabs.
- **Decision:** Implemented a dictionary state `messagesByChat` mapping a unique `chatId` to an array of messages. This properly isolates session histories.

## Initial Data Loading
- **Problem:** The application initially loaded hardcoded, fake repository and chat data by default.
- **Decision:** Removed all mock data and initialized arrays to `[]`. Since the backend (`server.js`) currently lacks `GET` endpoints for fetching past histories from a database, the chat state is maintained entirely in memory for the duration of the current session.

## UI Component: Custom Dialogs
- **Problem:** Native browser `prompt()` and `confirm()` windows broke immersion and looked jarring against the premium dark theme.
- **Decision:** Built a custom React `CustomDialog` component utilizing Framer Motion to handle rename and delete actions seamlessly within the DOM.

## Bot Avatar Iconography
- **Problem:** The original "AI" text bubble was uninspired and not visually engaging.
- **Decision:** Designed and implemented a minimal, transparent line-art Dev Terminal (`>_`) icon to reflect the developer-focused nature of the tool, selected after reviewing 6 generated mockup options.

## UploadPanel Global Scope
- **Problem:** The "Attach" button on the Welcome screen didn't function because the `UploadPanel` component was nested inside a conditional block that only rendered when `inChat` was true.
- **Decision:** Moved the `UploadPanel` to the root of the `main-area` and allowed it to utilize its internal `AnimatePresence` for proper global modal behavior regardless of the current chat state.
