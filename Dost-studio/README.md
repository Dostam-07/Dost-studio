# Dost Studio

> **Think. Build. Iterate.** — A local-first, AI-native product building platform.

Dost Studio lets you describe a product idea in plain language and generates a complete React application — PRD, architecture, components, and a live visual preview — all powered by a local Ollama model or OpenRouter.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [Chat — AI Code Editing](#chat--ai-code-editing)
- [File Upload & Attachments](#file-upload--attachments)
- [Export as ZIP](#export-as-zip)
- [Project History](#project-history)
- [Preview System](#preview-system)
- [Project Structure](#project-structure)
- [AI Agents](#ai-agents)
- [Settings & Models](#settings--models)
- [Development Notes](#development-notes)
- [Changelog](#changelog)

---

## Overview

Dost Studio is a full-stack web app that acts as an AI co-founder. You type a product idea, pick an enhancement style, and the system:

1. **Enhances** your prompt into a detailed product brief
2. **Generates a PRD** with features, user stories, personas
3. **Designs the architecture** — routes, components, state, database schema, API endpoints
4. **Writes all React/TypeScript source files** — components, pages, CSS
5. **Generates a standalone HTML preview** — visible immediately in the Preview panel
6. **Lets you iterate** — the Chat panel applies AI edits directly to project files

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Browser (React)                    │
│  HomePage → Prompt + Attach → AgentSystem              │
│  WorkspacePage → ChatPanel → edit files → preview      │
│  PreviewPanel ← iframe ← /preview/:id/demo.html        │
└─────────────────────┬──────────────────────────────────┘
                      │ HTTP / Socket.IO
┌─────────────────────▼──────────────────────────────────┐
│               Express Server (port 3001)               │
│  /api/ollama    → Proxy → Ollama (port 11434)          │
│  /api/projects  → CRUD  → projects/ on disk            │
│  /api/build/:id → scaffold + clean generated files     │
│  /api/export/:id → stream ZIP download                 │
│  /preview/:id/  → serve demo.html (AI HTML preview)    │
└────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────┐
│  projects/<uuid>/                     │
│  ├── metadata.json   PRD, arch, files │
│  ├── brain.json      conversation ctx │
│  ├── graph.json      knowledge graph  │
│  ├── demo.html       ← preview iframe │
│  ├── index.html      Vite entry point │
│  └── src/            generated source │
└───────────────────────────────────────┘
```

**Client port:** 5173 (Vite dev server)  
**Server port:** 3001 (Express + Socket.IO)  
**AI proxy:** `/api/ollama/*` → `localhost:11434` (Ollama)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | TailwindCSS 4, tailwind-merge |
| UI Components | shadcn/ui (Radix primitives) |
| State | Zustand 5 |
| Routing | React Router 7 |
| Backend | Express 5, Node.js |
| Realtime | Socket.IO 4 |
| AI (local) | Ollama (any model) |
| AI (cloud) | OpenRouter API |
| Storage | Filesystem (`projects/`) + localStorage (brain) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.com) running locally **or** an OpenRouter API key

### Install & Run

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

### Ollama Setup

```bash
ollama pull hermes3:8b
# or
ollama pull qwen2.5-coder:7b
```

Dost Studio auto-detects available models and assigns the best match per agent role.

### OpenRouter Setup

Open **Settings** and paste your OpenRouter API key. Default model: `deepseek/deepseek-chat`.

---

## How It Works

### Generation Pipeline

```
User Prompt (+ optional attached files)
    │
    ▼  enhancePrompt()
Enhanced Brief (productVision, personas, coreFeatures, pages…)
    │
    ▼  generatePRD()
PRD (features, userStories, technicalStack…)
    │
    ▼  generateArchitecture()
Architecture (routes, components, database, apiEndpoints…)
    │
    ▼  generateFiles()
    ├── Component .tsx files
    ├── Page .tsx files
    └── index.html (standalone Tailwind-CDN demo)
    │
    ▼  Saved to disk → demo.html served by /preview/:id/
```

### Knowledge Graph

Each project builds a knowledge graph: vision → features → pages → routes → components → files → decisions. Visible in the **Graph** panel.

### Project Brain

Stored in `localStorage` + `projects/<id>/brain.json`. Tracks:
- All prompts and conversations
- Architecture decisions with reasoning
- File modifications and version history
- Component/route relationships

---

## Chat — AI Code Editing

The Chat panel works like Lovable, Replit, Google Studio, or OpenCode.

### How it works

Every message is classified by intent:

**Edit mode** — triggered by: "add", "fix", "change", "make", "create", "implement", "style", "remove", etc.

1. The AI reads all project files + brain context
2. Generates targeted file changes as structured JSON
3. Shows a **review card** — each file with `+added / -removed` line counts and expandable preview
4. **Apply changes** — writes new code, creates a version snapshot, saves to disk, refreshes preview, switches to Preview panel
5. **Discard** — dismisses with strikethrough

**Chat mode** — questions and discussions stream back as plain text.

### Quick actions (empty state)

| Action | Prompt sent |
|---|---|
| Add dark mode | "Add dark mode support with a toggle button" |
| Fix responsive | "Make the layout fully responsive on mobile" |
| Add loading states | "Add loading spinners and skeleton states" |
| Improve styling | "Improve the overall visual design and spacing" |

---

## File Upload & Attachments

Both the **homepage prompt** and the **workspace Chat panel** support file attachments.

### Homepage prompt

Click the **📎 Attach** button next to the textarea to attach one or more reference files before building. Attached file contents are injected into the generation prompt as context, helping the AI understand your existing codebase or design constraints.

Accepted: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.html`, `.json`, `.md`, `.txt`, `.py`, `.yaml`, `.yml`, `.csv`

### Chat panel (workspace)

The paperclip button `📎` in the chat input opens a file picker. Supports:
- **Text files** — content is appended to the message as context
- **Images** — shown as thumbnail in the attachment chip, name noted in the prompt

Multiple files can be attached per message. Chips appear above the textarea with an `✕` to remove.

---

## Export as ZIP

Every project can be downloaded as a portable ZIP archive.

### How to export

In the Workspace toolbar, click the **↓ Export** button. The server:

1. Collects all files in `projects/<id>/` (excluding `node_modules/`, `dist/`, `.git/`)
2. Builds a ZIP using a minimal in-memory ZIP writer (Node built-in `zlib`, no extra dependencies)
3. Adds a `README.md` with run instructions if none exists
4. Streams the ZIP as a download

### Running the exported project locally

```bash
# Extract the ZIP, then:
npm install
npm run dev
```

The project is a standard React + TypeScript + Vite + TailwindCSS app. It opens on http://localhost:5173.

---

## Project History

Projects are persisted on disk under `projects/<uuid>/metadata.json`. On app startup, `loadProjectsFromServer()` fetches all saved projects from `GET /api/projects` and merges them into the Zustand store — so your work survives page refreshes.

### Workspace — no project selected

When you navigate to the Workspace without an active project, a **project grid** shows all saved projects sorted by last-modified date. Clicking any card opens that project.

### Project switcher (toolbar)

When a project is open, the project name in the toolbar is clickable. It opens a **dropdown drawer** showing all projects with:
- Name and description
- File count
- Last modified date
- Active project indicator

Click any entry to switch instantly.

### Version history panel

The **History** tab in the left sidebar shows all versions created by chat edits, newest first. Each entry shows:
- Version number (v1, v2…)
- Timestamp
- Added / modified / deleted file counts
- Description from the AI

---

## Preview System

The preview shows the **actual generated React app** with full navigation (React Router), served through a per-project Vite dev server.

### Serving flow

```
Browser → Main Vite (5173) → Express (3001) → Project Vite (4173+)
                        ↓                      ↓
                   /preview/:id/          injects selection
                   proxy route            script into HTML
```

1. **Build** saves the project, scaffolds Vite files, runs `npm install`, starts a Vite dev server
2. **Express** proxies `/preview/:id/` to the project Vite dev server, injecting the selection script
3. **Vite dev server** serves the React app with HMR, routing, and live reload
4. **Fallback**: If `npm install` or the dev server fails, Express serves `demo.html` (AI-generated static preview)

### Why the React app works in preview

With `base: '/preview/<projectId>/'` in the generated `vite.config.ts`, all asset paths (JS, CSS, images) are prefixed so they route through Express → Vite dev server correctly. `App.tsx` is generated with `<BrowserRouter>` + `<Routes>` matching architecture routes to component files.

### Click "Preview" / "Refresh Preview"

Calls `POST /api/build/:id` which:
1. Scaffolds Vite project files (`src/`, `package.json`, `vite.config.ts`, etc.)
2. Strips markdown artifacts from generated files
3. Runs `npm install` (with progress via Socket.IO)
4. Starts the Vite dev server (awaits ready signal)
5. Emits `build-complete` — iframe loads the live React app

### Auto-start on workspace load

When entering a previously built project, PreviewPanel auto-checks the dev server. If not running, it calls `/api/dev-server/:id/start` to scaffold, install, and launch it automatically.

---

## Project Structure

```
Dost-studio/
├── src/
│   ├── components/
│   │   ├── chat/ChatPanel.tsx        AI engineer chat with edit cards
│   │   ├── editor/EditorPanel.tsx    File viewer
│   │   ├── layout/TopNavigation.tsx  Top nav bar
│   │   ├── preview/PreviewPanel.tsx  iframe preview + build button
│   │   ├── project/                  FileExplorer, KnowledgeGraphView,
│   │   │                             ProductManager, UXReviewer,
│   │   │                             DesignCritic, VisionUpload
│   │   └── ui/                       shadcn/ui primitives
│   ├── pages/
│   │   ├── HomePage.tsx              Prompt, attach, build, project grid
│   │   ├── WorkspacePage.tsx         Workspace + project switcher drawer
│   │   └── SettingsPage.tsx          Model & API config
│   ├── services/
│   │   ├── agents.ts                 AgentSystem — enhance/PRD/arch/code/edit
│   │   ├── ollama.ts                 Ollama + OpenRouter client
│   │   ├── projectBrain.ts           Brain persistence
│   │   ├── knowledgeGraph.ts         Graph builder
│   │   ├── diffEngine.ts             LCS diff
│   │   ├── versioning.ts             Version snapshots
│   │   ├── contextAwareEditing.ts    Change planning
│   │   └── visionAgent.ts            Image analysis
│   ├── stores/appStore.ts            Zustand global state
│   └── types/index.ts                All TypeScript interfaces
├── server/index.ts                   Express: CRUD, proxy, preview, export
└── projects/                         Generated project data
```

---

## AI Agents

All agents are in `src/services/agents.ts` (`AgentSystem` class).

| Method | Role | Output |
|---|---|---|
| `enhancePrompt()` | Product Strategist | `EnhancedPrompt` JSON |
| `generatePRD()` | Product Manager | `PRD` JSON |
| `generateArchitecture()` | Software Architect | `Architecture` JSON |
| `generateFiles()` | Senior Engineer | `ProjectFile[]` |
| `chatWithProject()` | AI Co-founder | Streaming text |
| `detectIntent()` | Intent classifier | `'edit' \| 'chat'` |
| `planEdits()` | Code editor | `EditResult` JSON |

### Enhancer Styles (10 modes)

Balanced Strategist · Technical Architect · UX Visionary · Growth Hacker · Lean MVP · Enterprise Scale · Data Driven · Design Thinker · Security First · Mobile Native

---

## Settings & Models

| Setting | Default | Notes |
|---|---|---|
| API Provider | `openrouter` | Switch to `ollama` for local |
| OpenRouter Key | (default key) | Replace with your own |
| OpenRouter Model | `deepseek/deepseek-chat` | Any OpenRouter model |
| Planner model | auto-detected | enhance + PRD |
| Architect model | auto-detected | architecture design |
| Coder model | auto-detected | file generation + edits |
| Vision model | auto-detected | screenshot/image input |

---

## Development Notes

```bash
npm run server   # Express only, port 3001
npm run client   # Vite only, port 5173
npm run dev      # Both concurrently
```

The Vite dev server proxies `/api/*` and `/socket.io` to `localhost:3001`.

---

## Changelog

### Export + Upload + Project History (latest)

**Export as ZIP**
- New `GET /api/export/:id` endpoint streams a ZIP of the project
- Uses Node built-in `zlib` — zero new dependencies
- Excludes `node_modules/`, `dist/`, `.git/`
- Adds auto-generated `README.md` with run instructions
- **↓ Export** button in Workspace toolbar

**File Attachments**
- Homepage prompt: **📎 Attach** button adds reference files as context to the generation prompt
- Chat panel: paperclip button opens file picker; text files injected as context, images shown as thumbnails
- Accepted: images, `.ts/.tsx/.js/.jsx/.css/.html/.json/.md/.txt/.py/.yaml/.yml/.csv`

**Project History**
- `App.tsx` calls `loadProjectsFromServer()` on mount — projects survive page refresh
- No-project workspace shows a full **project grid** sorted by last-modified
- Project name in toolbar is now a **dropdown switcher** showing all projects
- History panel versions are now **newest first**, with coloured add/modify/delete counts

### AI Chat — Code Editing

- Chat intent detection routes to `edit` or `chat` mode
- Edit mode plans structured `fileEdits` via `agentSystem.planEdits()`
- Review cards show per-file diffs with expand/collapse
- Apply writes files, creates version, saves to disk, refreshes preview
- Discard dismisses with strikethrough

### Preview Fix

- `extractHtmlDocument()` strips markdown wrapper from AI-generated HTML
- Applied at scaffold, build, and preview-serve time
- `PreviewPanel` auto-detects existing `demo.html` and shows preview immediately

### Same-Origin Preview + Element Selection

- Preview is always served through Express (`/preview` proxy) for selection script injection
- Selection tool: hover highlight overlay + click-to-select with `postMessage` communication
- `/api/element-edit` endpoint calls AI with project files as context and applies edits
- Vite dev server proxied through Express for unified preview experience

### Editor & Collaboration

- Auto-save with 800ms debounce — saves to store and server on content change
- Multi-file tabs with open/close management in editor
- File create (`+`) and delete (hover `✕`) directly in FileExplorer tree

### UI Improvements

- Left panel collapsible via `◀`/`▶` button in the icon sidebar
- PRD section has "Download PRD" button exporting to Markdown
- VisionUpload now stores actual MIME type instead of hardcoded `image/png`

### AI Provider Fixes

- `openRouterFetch()` now correctly forwards the model parameter — previously `this.openRouterModel` was always used, ignoring per-agent model config
- `ollamaService.configureWithSettings()` now also applies `ollamaUrl` (base URL) — previously only took effect after testing connection in SettingsPage
- `configureWithSettings()` called in `loadSettings`/`updateSettings` store actions and on app mount — chat now uses the configured provider (Ollama/OpenRouter) instead of defaulting to Ollama
- Server syncs settings via `/api/settings` endpoints so `/api/element-edit` uses the correct AI config

### Dynamic Preview (Vite Dev Server)

The preview now shows the **actual generated React app** with full navigation and multi-page support, not just the static `demo.html`:

- `POST /api/build/:id` now runs `npm install` and awaits `startDevServer()` before marking build complete
- New `POST /api/dev-server/:id/start` endpoint — scaffolds, installs deps, starts Vite dev server
- Generated `vite.config.ts` sets `base: '/preview/<projectId>/'` so all assets route correctly through Express proxy
- `App.tsx` generated with React Router (`<BrowserRouter>`, `<Routes>`) matching architecture routes to component files
- `package.json` includes `react-router-dom` dependency
- PreviewPanel auto-starts dev server on mount if build is done but server not running
- HomePage auto-saves project and triggers build after generation — preview ready when workspace loads
- Falls back gracefully to `demo.html` if `npm install` or dev server fails
