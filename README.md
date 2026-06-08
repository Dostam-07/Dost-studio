<p align="center">
  <br>
  <em style="font-size:13px;color:#8a8780;letter-spacing:0.12em;text-transform:uppercase">Local-first AI app builder</em>
  <br><br>
  <span style="font-size:56px;font-weight:400;letter-spacing:-0.03em;line-height:1">Dost <em style="font-style:italic;color:#c8b8a2">Studio</em></span>
  <br><br>
  <span style="font-size:17px;color:#8a8780;max-width:480px;display:inline-block;line-height:1.55">Turn a plain-text idea into a running, multi-page React app — PRD, architecture, components, live preview — on your machine.</span>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/open_source-✓-4ade80?style=flat&labelColor=1c1c20&color=4ade80" alt="Open source">
  <img src="https://img.shields.io/badge/local_first-✓-2dd4bf?style=flat&labelColor=1c1c20&color=2dd4bf" alt="Local-first">
  <img src="https://img.shields.io/badge/zero_cloud_lock_in-✓-60a5fa?style=flat&labelColor=1c1c20&color=60a5fa" alt="Zero cloud lock-in">
  <img src="https://img.shields.io/badge/Node.js-18+-8a8780?style=flat&labelColor=1c1c20&color=8a8780" alt="Node.js 18+">
</p>

```bash
git clone https://github.com/yourusername/dost-studio.git
cd dost-studio
npm install && npm run dev
# → http://localhost:5173
```

<br>

---

## Build pipeline

**Type an idea. Press Build.**

Seven AI agents run in sequence — each one sees the output of those before it — producing a coherent, navigable app.

1. **Enhance prompt** — Structured product brief from plain language. 10 writing styles.
2. **Generate PRD** — Features, personas, user stories, success metrics.
3. **Design architecture** — Routes, components, state, database schema, API endpoints.
4. **Write every source file** — Full `.tsx` files with proper routing, default exports, Layout.
5. **Start Vite dev server** — Live preview with HMR and full React Router navigation.
6. **Iterate in chat** — Describe a change. See a diff. Apply it. Preview refreshes.

---

## Why Dost

**Not another chat-to-code wrapper.**

Most AI coding tools are editors with a chat panel. Dost is a complete product-building platform.

| Tool | What it does | Dost advantage |
|---|---|---|
| **Cursor / Windsurf** | AI-assisted editing | Generates the **entire app** from a prompt |
| **Bolt.new / Lovable** | One-shot cloud generation | **Local-first** — code never leaves your machine |
| **v0.dev** | Component generation | Full **multi-page apps** with routing, PRD, architecture |
| **GitHub Copilot** | Autocomplete | Persistent **project brain**, version control, deep research |

---

## AI providers

Three modes. One app.

| Mode | Cost | Latency | Privacy | Model |
|---|---|---|---|---|
| **Local · Ollama** | Free | Fast (no network) | 100% offline | `qwen2.5-coder:7b` |
| **Cloud · OpenRouter** | ~$0.01/build | Medium | Leaves machine | `deepseek/deepseek-chat` |
| **Auto-fallback** | Graceful | — | — | Key exhausted → Ollama |

---

## AI agents

Seven specialists. One pipeline.

- **🧭 Planner** — Turns your prompt into a structured product vision
- **📋 Product Manager** — Generates a full PRD with features, personas, user stories
- **🏗️ Architect** — Designs routes, components, state, database, and API
- **⚙️ Engineer** — Writes every `.tsx` file with proper routing and exports
- **👁️ Vision Agent** — Analyzes screenshots and Figma frames for design cues
- **🧠 Deep Analyst** — Conversational research — chat with AI, then `/prompt` to build
- **🤝 AI Co-founder** — Chat edits with diff review, versioning, and undo

---

## Tech stack

**Zero database. Zero Docker.** One `npm install && npm run dev` and everything runs.

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, TypeScript |
| Styling | TailwindCSS 4 |
| State | Zustand 5 |
| Routing | React Router 7 |
| Backend | Express 5, Socket.IO 4 |
| Storage | Filesystem (`projects/`) + localStorage |

---

## Deep Research — conversational AI deep thinking

Click **🧠 Deep Analysis** in the toolbar to enter research mode — a back-and-forth conversation with your local AI:

1. Type your topic → AI delivers deep analysis with insights
2. Ask follow-ups → AI builds on previous context
3. Type **`/prompt`** → AI synthesizes the full conversation into a build prompt
4. Hit **Build** to create your app

No API keys needed. Uses Ollama `qwen2.5-coder:1.5b`. Works 100% offline.

---

## Inputs

| What | How |
|---|---|
| A sentence | `"A SaaS dashboard for GitHub repo analytics"` |
| Reference code | Attach `.tsx` / `.js` / `.css` files |
| Screenshots | Drop an image → Vision Agent analyzes layout |
| `.fig` files | Drop a Figma file → parsed locally (no API key) |
| Figma URL | REST API imports design tokens + component tree |

All inputs combine into a single enriched prompt that feeds the generation pipeline.

---

## Project Brain — persistent AI memory

| What | Where |
|---|---|
| Generation prompt | `brain.json` |
| Chat history | `brain.json` — full context for every edit |
| Architecture decisions | `brain.json` — problem, alternatives, solution |
| File modifications | `brain.json` — every edit tracked |
| Knowledge graph | `graph.json` — vision → features → pages → routes → components → files |
| Versions | `metadata.json` — every edit is a snapshot, rollback with one click |

---

## FAQ

**Q: Is Dost Studio free?**  
Completely free and open-source. Use Ollama for zero-cost local AI, or OpenRouter's free tier.

**Q: How does it compare to Bolt.new or Lovable?**  
Dost is local-first — your code stays on your machine. Bolt and Lovable are cloud-only. Dost also generates full multi-page apps with persistent memory.

**Q: What AI models does it support?**  
Any model via Ollama (local) or OpenRouter (cloud). Recommended: `qwen2.5-coder:7b` locally, `deepseek/deepseek-chat` on cloud.

**Q: Can I export my generated app?**  
Yes. Every project exports as a portable ZIP — standard React + TypeScript + Vite + Tailwind. Works without Dost Studio.

**Q: Is my data private?**  
With Ollama, everything stays local. With OpenRouter, data goes to the cloud provider you choose.

---

## Quick start

```bash
npm install
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:3001
```

**Ollama** (free, local):
```bash
ollama pull qwen2.5-coder:7b
```

**OpenRouter** (cloud):
Paste your API key in Settings → default model `deepseek/deepseek-chat` (free).

---

## Architecture

```
Browser (React + Vite) ─── HTTP/Socket.IO ─── Express (3001)
                                                    │
                                              ┌─────┴─────┐
                                         Ollama (11434)  OpenRouter (cloud)
                                              │
                                         projects/<uuid>/
                                           ├── metadata.json
                                           ├── brain.json
                                           ├── graph.json
                                           ├── src/
                                           └── package.json
```

---

## Changelog

### Conversational Deep Research + Code Quality

- **Conversational Deep Research**: Click 🧠 Deep Analysis for a back-and-forth chat with AI. Type `/prompt` to synthesize into a build prompt.
- **Code quality**: Eliminated 3-way duplication of research mode logic. Fixed stale closure race condition. Removed dead state and render paths.
- **Ollama error handling**: `callLLM()` now detects Ollama `{ status: 'error' }` responses and rejects properly instead of passing raw JSON to the user.

### AI Deep Analysis + Chat-Centric UX

- Replaced web search with Kimi-style AI deep thinking via local Ollama.
- Chat-centric homepage with message history, templates, and recent projects.
- Theme toggle (dark/light), slimmed navbar (48px), cleaner settings cards.

### .fig File Support

- Full `.fig` ZIP parsing via `fflate` — client-side, no API key needed.
- Extracts design tokens, component hierarchy, embedded PNGs with Vision Agent analysis.
- Works alongside Figma REST API for URL-based import.

### Live Preview with Navigation

- Every generated app gets Vite dev server with React Router, responsive navbar, HMR.
- `App.tsx` + `Layout.tsx` auto-generated and regenerated on every file change.
- Selection tool: hover any element, click, describe a change — AI edits your code.

### Multi-Key OpenRouter Rotation

- 5 API keys in rotation with auto-fallback to Ollama on 401/402/429.
- Per-key credit tracking with progress bars in Settings and navbar pill.

---

<p align="center">
  <span style="font-size:13px;color:#5a5855;font-style:italic">Local-first, always.</span>
  <br>
  <span style="font-size:11px;color:#5a5855">Dost Studio — open source</span>
</p>
