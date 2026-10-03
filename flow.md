# Application Data Flows

> Log updated on: 2026-10-02
> This file tracks the application data flow following the multi-session state management rewrite.

## Core Data Structures
```javascript
// Array of ingested projects
repositories: [{ id, repo_name, type, files, time }]

// Array of conversations linked to projects
chats: [{ id, repoId, title, subtitle, time, msgs }]

// Dictionary mapping a specific chat session to its message history
messagesByChat: {
  [chatId]: [{ sender: 'user'|'bot', text: '...' }]
}
```

## 1. Context Switching Flow
1. User clicks a repository item in the Sidebar.
2. `activeRepoId` state updates.
3. The system scans the `chats` array to find the first chat associated with that `repoId`.
4. `activeChatId` state updates to match.
5. Main window automatically reacts: `const messages = messagesByChat[activeChatId] || []`.

## 2. Ingestion & Initial Chat Flow
1. User uploads ZIP or provides GitHub URL via the `UploadPanel`.
2. Backend processes and returns `repoId` and `repoName`.
3. A new `chatId` is generated using `Date.now()`.
4. The repo object is pushed to `repositories`.
5. The chat object is pushed to `chats`.
6. `messagesByChat` is seeded with `[newChatId]: [{ sender: 'bot', text: 'Successfully ingested...' }]`.
7. `UploadPanel` unmounts globally.

## 3. Message Sending Flow
1. User types and hits Send (on the Welcome Screen or inside an Active Chat).
2. If `activeChatId` is null (e.g., sending directly from the Welcome Screen), a new `chatId` is immediately generated and linked to the `activeRepoId`.
3. The user's text is appended to `messagesByChat[currentChatId]`.
4. A POST request is sent to `/api/query` containing the `repoId` and the current `history` array (from `messagesByChat`).
5. The backend returns an answer.
6. The bot's answer is appended to `messagesByChat[currentChatId]`.
7. The sidebar `chats` array maps over its state to increment the `msgs` count by 2 and sets the `subtitle` to the user's latest prompt.

## 4. Deletion Flow
1. User clicks delete on a Chat in the sidebar.
2. `CustomDialog` intercept triggers.
3. Upon confirmation, the chat is filtered out of the `chats` array.
4. The corresponding key is deleted from `messagesByChat` to free up memory.
5. The system attempts to select the next available chat for the current repository. If none exist, it falls back to the Welcome Screen.
