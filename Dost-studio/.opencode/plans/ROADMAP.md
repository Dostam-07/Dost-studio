# Dost Studio — Product Roadmap

> **Status as of**: June 7, 2026
> **All items ordered by priority** within each tier. Each item includes estimated effort and clear acceptance criteria.

---

## Legend

| Icon | Meaning |
|------|---------|
| 🟢 | Complete |
| 🟡 | In progress |
| ⬜ | Not started |
| 🚫 | Blocked |

---

## Phase 0 — Foundation (Complete)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Vite + React + TS + TailwindCSS | Project scaffold, routing, dark theme |
| 🟢 | Zustand store | Central state with `appStore` — projects, chat (scoped), panels, settings |
| 🟢 | Express 5 server | Proxy for Ollama, project CRUD, build, preview, export ZIP |
| 🟢 | Socket.IO | Real-time events for file changes, build completion, preview reload |
| 🟢 | Ollama proxy | Keep-alive agent, retry logic, 502/timeout handling |
| 🟢 | OpenRouter support | Dual provider: Ollama (local) or OpenRouter (cloud) |
| 🟢 | shadcn/ui components | Button, Card, Badge, Input, ScrollArea |

## Phase 1 — Generation Pipeline (Complete)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Prompt enhancement | 10 Enhancer Styles with individual system prompts |
| 🟢 | PRD generation | Structured PRD with features, user stories, personas |
| 🟢 | Architecture generation | Component tree, routes, folder structure, DB schema |
| 🟢 | Code generation | Generates `.tsx` files + standalone `index.html` preview |
| 🟢 | Generate all pipeline | Orchestrates enhance → PRD → architecture → code |
| 🟢 | Progress tracking | Stage-by-stage progress bar with status icons |
| 🟢 | Generation error handling | Error cards with retry, fallback messages |

## Phase 2 — Project System (Complete)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Project CRUD | Create, read, delete, rename (server endpoints + UI) |
| 🟢 | Project persistence | Save to disk (metadata.json, files, brain.json, graph.json) |
| 🟢 | Project switcher | Dropdown in toolbar + project drawer with search |
| 🟢 | Home page project listing | Shows top 3 latest projects, expandable |
| 🟢 | Template grid | 9 templates (SaaS, CRM, Marketplace, etc.) |
| 🟢 | Export as ZIP | Custom ZIP builder with DEFLATE |

## Phase 3 — Workspace & Editor (Complete with 1 bug fix pending)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Left panel tabs | Chat, Files, PRD, Tasks, Graph, Vision, PM, UX, Design, History |
| 🟢 | File explorer | Tree view with icons per file extension |
| 🟢 | Editor panel | Editable textarea with line numbers + save button |
| 🟢 | Bug fix: Editor shows 3 lines | Removed `ScrollArea` wrapper, textarea now uses `flex-1` to fill space |
| 🟢 | Bug fix: Double scroll in editor | Single native textarea scrollbar instead of nested scroll areas |
| 🟢 | Preview panel | Build button, device toggle (desktop/tablet/mobile), iframe |
| 🟢 | Right panel toggle | Preview / Editor switch |

## Phase 4 — Chat & AI Interaction (Complete)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Chat panel | Send messages, auto-scroll, quick action buttons |
| 🟢 | Intent detection | 'edit' vs 'chat' routing based on keywords |
| 🟢 | Edit cards | File change list with diff preview, Apply/Discard buttons |
| 🟢 | Apply changes | Saves files, creates version, updates brain, triggers preview |
| 🟢 | File upload in chat | Text files + image attachments with vision analysis |
| 🟢 | Vision → Chat integration | Image attachments analyzed via visionAgent; analysis prepended to prompt |
| 🟢 | Markdown rendering | Code blocks, headers, lists, bold, inline code in chat responses |
| 🟢 | Context-aware editing | `contextAwareEditing.analyzeRequest()` with fallback to `planEdits()` |
| 🟢 | Scoped chat messages | Messages keyed by `projectId`; loaded from brain on switch |
| 🟢 | Richer brain context | Last 5 conversations, last 3 modifications, active file path |
| 🟢 | Knowledge graph | Built from project data, persisted in brain |

## Phase 5 — Preview & Build (Partial)

| Status | Item | Description |
|--------|------|-------------|
| 🟢 | Build endpoint | Scaffolds project, cleans code fences, marks done (no npm install) |
| 🟢 | Preview middleware | Serves `demo.html` (AI-generated standalone preview) from Express |
| 🟢 | Auto-refresh preview | `previewRefreshKey` in store; ChatPanel triggers after Apply |
| 🟢 | **Socket.IO wired to PreviewPanel** | Listen for `build-complete` and `reload-preview` events instead of polling HTTP |
| 🟢 | **Live Vite dev server per project** | Spawn `vite --port <dynamic>` per project; track ports server-side; iframe points to live server; auto-restart on file changes via chokidar |

## Phase 6 — Polish & UX (Next Up)

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| 🟢 | Fix: EditorPanel 3-line bug | 15 min | Textarea collapsed because `minHeight:100%` didn't resolve | Textarea fills available height, shows all content |
| 🟢 | Fix: EditorPanel double scroll | 15 min | ScrollArea + textarea native scrollbar fought | Single scrollbar on the textarea |
| 🟢 | **Socket.IO → PreviewPanel** | 2 hr | PreviewPanel listens for `build-complete` via Socket.IO, not HTTP polling | Switching to preview panel after Apply shows updated preview instantly (<500ms) |
| 🟢 | **Version rollback** | 1 hr | "Restore" button in History panel reverts files to a previous version | Clicking restore on a version reverts all files, creates a new version entry |
| 🟢 | **Settings: test connection** | 1.5 hr | "Test" button per provider (Ollama URL, OpenRouter key) that pings and shows success/failure | Green check or red error message after clicking Test |
| 🟢 | **Knowledge Graph clickable nodes** | 1 hr | Click a graph node → navigates to the file in editor | Clicking a file node sets `activeFile` and switches to editor panel |
| 🟢 | **Delete confirm dialog** | 30 min | Replace `confirm()` with inline styled confirmation | Styled inline confirmation with Cancel/Delete buttons |

## Phase 7 — AI Quality & Reliability

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| 🟢 | **Better code prompts** | 2 hr | Revise system prompts to forbid shadcn/ui imports, emphasize plain TailwindCSS/HTML, and require default exports | 80% of generated files compile without syntax errors |
| 🟢 | **Generated code validator** | 3 hr | `validateGeneratedCode()` that parses each `.tsx`/`.ts` file with esbuild, catches errors, auto-fixes common issues (missing default export, unclosed tags) | Files with syntax errors are caught and flagged before save; auto-fix handles 50%+ of common issues |
| 🟢 | **Per-file regeneration** | 2 hr | If a generated file fails validation, regenerate just that file instead of failing the whole pipeline | Broken individual files get retried up to 2 times with error context in the prompt |
| 🟢 | **Test generation** | 3 hr | AI generates basic smoke tests (renders without crash, has expected elements) for each component | Each generated component has a companion `.test.tsx` file |

## Phase 8 — Live Preview (Game Changer)

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| 🟢 | **Vite dev server manager** | 4 hr | Server module that spawns/kills Vite dev servers per project on dynamic ports; tracks PID, port, status | Starting a preview spawns a Vite dev server on a unique port; switching projects kills the old server |
| 🟢 | **Iframe → live Vite** | 1 hr | Point preview iframe at `http://localhost:<dynamic-port>` instead of Express static | Iframe shows the live React app with hot reload |
| 🟢 | **Chokidar file watcher** | 2 hr | Watch project directory; on file change, trigger Vite rebuild + send `preview-reload` via Socket.IO | Editing a file in the editor and saving automatically triggers a preview refresh |
| 🟢 | **Build status improvements** | 1 hr | Show real-time build progress events via Socket.IO | User sees scaffold/validate/dev-server stage messages during build |

## Phase 9 — Advanced Editor

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| ⬜ | **CodeMirror 6 integration** | 4 hr | Replace textarea with CodeMirror 6; support TypeScript/TSX syntax highlighting, bracket matching, auto-indent | Full syntax highlighting, 40+ line files scroll smoothly, no layout jank |
| ⬜ | **Multi-file tabs** | 3 hr | Open multiple files in tabs at the top of the editor; switch between them | Clicking a file in the explorer opens a tab; clicking another file opens a second tab; tabs are closable |
| ⬜ | **Diff view** | 3 hr | Show a side-by-side or unified diff when viewing file changes before applying | Green/red line highlighting, line numbers, accept/reject per hunk |

## Phase 10 — Settings & Configuration

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| 🟢 | **Test connection button** | 1.5 hr | Per-provider test that calls a lightweight endpoint and shows result | Green checkmark for success, red error for failure |
| 🟢 | **Model-per-agent picker** | 1 hr | Dropdown per agent role (planner/architect/coder/vision) showing available models from both providers | Selecting a model updates the store and is used in the next generation call |
| ⬜ | **Ollama URL validation** | 30 min | Validate that the URL is reachable before saving | Error message if URL is unreachable |
| 🟢 | **Settings persistence** | 1 hr | Save settings to localStorage so they survive page refresh | Reloading the page preserves all settings |
| ⬜ | **System prompt editor** | 2 hr | Allow users to view and customize the system prompts used by each agent and each enhancer style | A textarea shows the current prompt; saving updates it for future generations |

## Phase 11 — Templates & Sharing

| Status | Item | Effort | Description | Acceptance Criteria |
|--------|------|--------|-------------|-------------------|
| ⬜ | **Save as template** | 2 hr | Save a generated project as a reusable template (PRD + architecture + file structure, no file contents) | Saved template appears in the Home page template grid |
| ⬜ | **Template import** | 1 hr | Import a template from a JSON file | Loads template into the template grid |
| ⬜ | **GitHub push** | 3 hr | One-click push generated project to a new GitHub repo (via `gh repo create` + `git push`) | Creates a public repo and pushes the generated code |
| ⬜ | **Share preview link** | 2 hr | Generate a public URL for the preview iframe that can be shared | Anyone with the link can view the live preview |

## Phase 12 — Productization

| Status | Item | Effort | Description |
|--------|------|--------|-------------|
| ⬜ | Authentication | 1 week | Local auth or OAuth (GitHub/Google) for multi-user |
| ⬜ | Project collaboration | 2 weeks | Shared project editing via Socket.IO |
| ⬜ | Usage analytics | 3 days | Track generations, errors, time-to-preview |
| ⬜ | Onboarding flow | 2 days | Tutorial steps, sample project, guided tour |
| ⬜ | Desktop app | 1 week | Tauri wrapper for native file system, tray icon, auto-update |
| ⬜ | Plugin system | 3 weeks | Custom agents, custom enhancer styles, custom templates |

---

## Current Sprint (All 13 Items Complete)

```
 1. 🟢 Socket.IO → PreviewPanel                (Phase 6, 2hr)
 2. 🟢 Version rollback                         (Phase 6, 1hr)
 3. 🟢 Settings: test connection                (Phase 6/10, 1.5hr)
 4. 🟢 Knowledge Graph clickable nodes          (Phase 6, 1hr)
 5. 🟢 Delete confirm dialog                    (Phase 6, 30min)
 6. 🟢 Better code prompts                      (Phase 7, 2hr)
 7. 🟢 Generated code validator                 (Phase 7, 3hr)
 8. 🟢 Per-file regeneration                    (Phase 7, 2hr)
 9. 🟢 Test generation                          (Phase 7, 3hr)
10. 🟢 Vite dev server manager + Iframe + Chokidar (Phase 8, 7hr)
11. 🟢 Build status improvements                (Phase 8, 1hr)
12. 🟢 Settings persistence                     (Phase 10, 1hr)
13. 🟢 Model-per-agent picker                   (Phase 10, 1hr)
```

---

## Key Decisions & Constraints

- **No shadcn/ui imports in generated code** — AI-generated components use pure TailwindCSS/HTML to avoid dependency issues
- **Windows-first** — All spawn commands use `cmd.exe /d /c` with `windowsVerbatimArguments: true`
- **OpenRouter preferred for generation** — Local CPU inference is too slow; OpenRouter is the default provider
- **Preview = demo.html** — Currently uses AI-generated standalone HTML; Vite dev server is the long-term replacement
- **Single keep-alive HTTP agent** — `maxSockets: 1` prevents Windows `EADDRINUSE` port exhaustion

---

*Generated June 7, 2026 · Items may be reprioritized based on user feedback*
