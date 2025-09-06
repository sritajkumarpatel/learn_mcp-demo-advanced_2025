# MCP Demo — Advanced (simulated)

**Short summary:**  
This is a small, **frontend-only simulation** that demonstrates core *ideas* behind an MCP-style assistant (orchestrator, tools, memory, safety, observability). It is **not** a production MCP server — it runs entirely in your browser so you can learn how the pieces fit together and experiment quickly.

---

## What this project is (and what it isn't)

**This project is:**
- A learning sandbox simulating how an MCP (Model + Customization + Tools + Policies) system behaves.
- A static web app (HTML/CSS/JS) implementing:
    - a tiny **orchestrator** (decision logic),
    - **tools** (time, calculator, joke, weather),
    - simple **memory** (browser `localStorage`),
    - a basic **safety** filter (keyword blocklist),
    - simple **observability** (console + in-UI logs).

**This project is not:**
- A production-grade MCP server.
- A secure system for secrets or API keys.
- A backend-based architecture (no multi-user persistence, no real auth).

---

## Why this project was made

Learning MCP concepts can be abstract. This repo lets you:
- See and tinker with the **orchestration flow** in plain JS.
- Add/change **tools** and test how the orchestrator routes requests.
- Understand how **memory** influences responses.
- Explore simple **safety** checks and logging/observability.
- Prototype ideas (e.g., adding a real LLM call or backend memory store) with minimal setup.

It's intentionally lightweight so you can focus on the *concepts*.

---

## Key architecture (how it maps to MCP concepts)

```
[User UI] (index.html + style.css)
        ↓
[Orchestrator] — in app.js → decides how to handle each message
        ├── Safety (keyword checks)
        ├── Memory (localStorage, MEM_KEY)
        ├── Tools (time, calc, joke, weather)
        └── Observability (logs array + console + log panel)
        ↓
[Response displayed to user]
```

- **Orchestrator:** `assistantRespond(...)` in `app.js`  
- **Memory:** localStorage (`MEM_KEY` in `app.js`)  
- **Tools:** `tool_time()`, `tool_calc()`, `tool_joke()`, `tool_weather()`  
- **Safety:** `safetyCheck(input)` using a BLOCKED_KEYWORDS list  
- **Observability:** `log(...)` pushes entries to console and UI panel

---

## Files included

- `index.html` — UI
- `style.css` — styling
- `app.js` — orchestrator, tools, memory, safety, logs (main logic)
- `README.md` — this file

---

## How to use (quick start)

1. Clone or create the project folder and add the files.
2. Open the folder in VS Code and run a static server:
   - **Recommended:** Install Live Server extension in VS Code, open `index.html` with Live Server.
   - **Or:** Use Python:
     ```bash
     python3 -m http.server 8000
     # open http://localhost:8000/index.html
     ```
3. Interact with the chat UI:
   - Save a memory: set Your name and Tone, click Save memory.
   - Try messages (examples below).

**Example prompts to try:**
- `what's the time?` → uses the time tool
- `calc 56 * 39` or `calculate (10+2)/3` → uses the calculator tool
- `tell me a joke` or `joke` → uses the joke tool
- `weather in Bengaluru` → uses the weather tool (simulated)
- `remember my favorite bike is Himalayan` → stores a note in memory
- `show memory` → prints the memory JSON
- `delete all files` → should be blocked by safety filter

**Live weather (optional):**
To enable live weather, create a (free) API key at OpenWeatherMap and paste it into `app.js`:
```js
// near the top of app.js
const WEATHER_API_KEY = '<YOUR_OPENWEATHERMAP_API_KEY>';
```
*Important:* Do **not** commit API keys to public repos. For public/production use, hide the key on a backend and call weather from a server endpoint.

---

## Benefits

- Fast learning loop: change JS, refresh browser, observe effects immediately.
- Low friction: no servers, no cloud infra, runs locally.
- Clear mapping: each MCP concept is visible in a small number of lines of code.
- Safe experimentation: practice adding tools, memory, safety rules before building a backend.

---

## Limitations & cautions

- **Browser-only persistence:** memory is stored in localStorage and only available on that device/browser.
- **Security:** client-side API keys are exposed. Do not use this pattern for production secrets.
- **Safety:** keyword blocklist is not production-ready. Real safety systems require more sophisticated analysis.
- **Eval usage in calculator:** `eval` is used in a controlled way but is still risky. For anything real, use a safe expression parser or move calculations to a backend.

---

## Suggested next steps

To make it more production-like, consider:
- Adding a backend (Node.js + Express) to store memory in a database and host a secure proxy for API keys.
- Accepting and persisting logs for observability.
- Replacing/augmenting responses with a real LLM call (server-side).
- Replacing `eval` with a math parser library (e.g., mathjs) or running calculations server-side.
- Building richer safety checks (intent classifier, regex, human-in-the-loop escalation).
- Adding authentication so memory is per-user (JWT + DB).
