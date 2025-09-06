/* MCP Demo Advanced - app.js (updated)
   Adds:
   - tool_joke() : returns random joke (local)
   - tool_weather(city) : fetches OpenWeatherMap or returns simulated fallback
   - assistantRespond is now async to support fetch-based tools
   - send handler awaits async assistantRespond
   Notes:
   - Paste your OpenWeatherMap API key into WEATHER_API_KEY below for live weather.
*/

// ---------- CONFIG ----------
const WEATHER_API_KEY = ""; // <-- OPTIONAL: paste your OpenWeatherMap API key here (don't commit to public repos)
// ----------------------------

// UI refs
const chatEl = document.getElementById("chat");
const msgEl = document.getElementById("message");
const sendBtn = document.getElementById("send");
const saveBtn = document.getElementById("saveMemory");
const clearBtn = document.getElementById("clearMemory");
const nameEl = document.getElementById("name");
const toneEl = document.getElementById("tone");
const showLogsBtn = document.getElementById("showLogs");
const clearLogsBtn = document.getElementById("clearLogs");
const logPanel = document.getElementById("logPanel");

// Simple in-memory log store for UI
let logs = [];

// Helpers for logs
function log(message, meta = {}) {
  const entry = { ts: new Date().toISOString(), message, meta };
  logs.push(entry);
  console.log("[MCP-LOG]", entry);
  // also append to logPanel if visible
  if (!logPanel.hidden) {
    const p = document.createElement("div");
    p.textContent = `${entry.ts} — ${entry.message} ${
      meta && meta.detail ? " — " + meta.detail : ""
    }`;
    logPanel.appendChild(p);
    logPanel.scrollTop = logPanel.scrollHeight;
  }
}

// Render chat messages
function renderMessage(text, who = "bot") {
  const d = document.createElement("div");
  d.className = "message " + (who === "user" ? "user" : "bot");
  d.textContent = text;
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Memory: localStorage
const MEM_KEY = "mcp_adv_memory";
function loadMemory() {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    log("Loaded memory", { detail: JSON.stringify(parsed) });
    return parsed || {};
  } catch (e) {
    console.error("Memory load error", e);
    return {};
  }
}
function saveMemoryToStore(mem) {
  localStorage.setItem(MEM_KEY, JSON.stringify(mem));
  log("Saved memory", { detail: JSON.stringify(mem) });
}
function saveMemory() {
  const m = {
    name: nameEl.value.trim(),
    tone: toneEl.value,
    note: loadMemory().note || null,
  };
  saveMemoryToStore(m);
  renderMessage("Memory saved: " + JSON.stringify(m), "bot");
}
function clearMemory() {
  localStorage.removeItem(MEM_KEY);
  nameEl.value = "";
  toneEl.value = "friendly";
  renderMessage("Memory cleared.", "bot");
  log("Memory cleared");
}

// ------------------ Tools ------------------

// Joke tool: local list of jokes (works offline)
function tool_joke() {
  log("Tool called: joke");
  const jokes = [
    "Why did the programmer quit his job? Because he didn't get arrays.",
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "How many programmers does it take to change a light bulb? None — that's a hardware problem.",
    "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  ];
  const j = jokes[Math.floor(Math.random() * jokes.length)];
  return j;
}

// Weather tool: tries live OpenWeatherMap if API key present, otherwise returns simulated response
async function tool_weather(city) {
  log("Tool called: weather", { detail: city });
  city = (city || "").trim();
  if (!city) return 'Please specify a city. Example: "weather in Bengaluru"';

  // If API key is provided, call OpenWeatherMap
  if (WEATHER_API_KEY && WEATHER_API_KEY.length > 0) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&units=metric&appid=${encodeURIComponent(WEATHER_API_KEY)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        log("Weather API error", {
          detail: `${resp.status} ${resp.statusText}`,
        });
        // fall back to simulated if API fails
        return `Could not fetch live weather for "${city}" (status ${resp.status}). Here is a simulated response: 27°C, partly cloudy.`;
      }
      const data = await resp.json();
      // Build a short human-friendly reply
      const name = data.name || city;
      const c =
        data.main && typeof data.main.temp !== "undefined"
          ? `${data.main.temp}°C`
          : "N/A";
      const desc =
        data.weather && data.weather[0] && data.weather[0].description
          ? data.weather[0].description
          : "unknown";
      const humidity =
        data.main && data.main.humidity
          ? `${data.main.humidity}% humidity`
          : "";
      return `${name}: ${c}, ${desc}${humidity ? " — " + humidity : ""}.`;
    } catch (e) {
      log("Weather fetch error", { detail: e.message });
      // fallback simulated
      return `Could not fetch live weather for "${city}". Simulated: 26°C, sunny.`;
    }
  }

  // No API key: simulated reply (useful for offline testing)
  const samples = [
    `${city}: 27°C, partly cloudy — 60% humidity.`,
    `${city}: 22°C, light rain — 78% humidity.`,
    `${city}: 31°C, sunny — 40% humidity.`,
    `${city}: 15°C, chilly and clear — 55% humidity.`,
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

// Calculator tool (unchanged)
function tool_calc(expr) {
  log("Tool called: calc", { detail: expr });
  if (/[^0-9+\-*/(). %]/.test(expr)) {
    throw new Error("Invalid characters in expression");
  }
  try {
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    if (typeof result === "number" && isFinite(result)) return result;
    throw new Error("Invalid calculation result");
  } catch (e) {
    throw new Error("Calculation error");
  }
}

// Time tool (unchanged)
function tool_time() {
  log("Tool called: time");
  return new Date().toLocaleString();
}

// ------------------ Safety ------------------
const BLOCKED_KEYWORDS = [
  "delete all files",
  "rm -rf",
  "shutdown",
  "format",
  "password",
  "credit card",
  "ssn",
  "social security",
];
function safetyCheck(input) {
  const lower = input.toLowerCase();
  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw)) {
      log("Safety block", { detail: kw });
      return {
        ok: false,
        reason: `Request blocked for safety or privacy: "${kw}"`,
      };
    }
  }
  return { ok: true };
}

// ------------------ Orchestrator (async) ------------------
// assistantRespond is now async so we can await tools that call network
async function assistantRespond(input) {
  const memory = loadMemory();
  input = (input || "").trim();
  log("User message received", { detail: input });

  // 1. Safety
  const safe = safetyCheck(input);
  if (!safe.ok) {
    return safe.reason;
  }

  // 2. Remember command - "remember <text>"
  const rememberMatch = input.match(/^remember (?:that )?(.*)$/i);
  if (rememberMatch) {
    const note = rememberMatch[1];
    const mem = loadMemory();
    mem.note = note;
    saveMemoryToStore(mem);
    return `Okay — I will remember: "${note}".`;
  }

  // 3. Show memory
  if (/^(show|what).*(memory|do you remember|what did)/i.test(input)) {
    const mem = loadMemory();
    return "Memory: " + JSON.stringify(mem);
  }

  // 4. Tools: time
  if (
    /time|current time|what time/i.test(input) &&
    !/what time of/i.test(input)
  ) {
    const t = tool_time();
    return (
      (memory.name ? `${memory.name}, ` : "") + `the current time is ${t}.`
    );
  }

  // 5. Tools: calculator
  const calcMatch =
    input.match(/^(?:calc|calculate)\s+(.+)$/i) ||
    input.match(/^([0-9\.\s()+\-*/%]+)\s*$/);
  if (calcMatch) {
    const expr = (calcMatch[1] || calcMatch[0]).trim();
    try {
      const res = tool_calc(expr);
      return `Result: ${res}`;
    } catch (e) {
      log("Calc error", { detail: e.message });
      return "Sorry, could not compute that expression safely.";
    }
  }

  // 6. Tools: joke
  if (/\b(joke|tell me a joke|make me laugh)\b/i.test(input)) {
    const j = tool_joke();
    return j;
  }

  // 7. Tools: weather - "weather in <city>" or "what's the weather in <city>"
  const weatherMatch =
    input.match(/weather(?: in)?\s+([a-zA-Z\s\-']+)$/i) ||
    input.match(/what(?:'s| is) the weather in\s+([a-zA-Z\s\-']+)$/i);
  if (weatherMatch) {
    const city = weatherMatch[1].trim();
    try {
      const resp = await tool_weather(city);
      return resp;
    } catch (e) {
      log("Weather tool error", { detail: e.message });
      return `Sorry, could not retrieve weather for "${city}".`;
    }
  }

  // 8. Default: generate a reply based on tone
  const tone = memory.tone || "friendly";
  let resp = "";
  if (tone === "friendly") {
    resp =
      (memory.name ? `Hey ${memory.name}! ` : "") +
      `I heard: "${input}". How can I help further?`;
  } else if (tone === "concise") {
    resp = `Received: "${input}". Next?`;
  } else {
    resp = `You wrote: "${input}". What is your desired action?`;
  }

  // If there's a remembered note, add it
  const mem = loadMemory();
  if (mem.note) resp += ` (Also, you asked me to remember: "${mem.note}".)`;

  return resp;
}

// ------------------ UI events (async-aware) ------------------
sendBtn.onclick = async () => {
  const txt = msgEl.value.trim();
  if (!txt) return;
  renderMessage(txt, "user");
  msgEl.value = "";
  // process asynchronously
  try {
    const out = await assistantRespond(txt);
    renderMessage(out, "bot");
  } catch (e) {
    log("Orchestrator error", { detail: e.message });
    renderMessage("Internal error while processing your request.", "bot");
  }
};
saveBtn.onclick = saveMemory;
clearBtn.onclick = clearMemory;

showLogsBtn.onclick = () => {
  logPanel.hidden = !logPanel.hidden;
  if (!logPanel.hidden) {
    logPanel.innerHTML = ""; // populate with existing logs
    logs.forEach((e) => {
      const p = document.createElement("div");
      p.textContent = `${e.ts} — ${e.message} ${
        e.meta && e.meta.detail ? " — " + e.meta.detail : ""
      }`;
      logPanel.appendChild(p);
    });
    logPanel.scrollTop = logPanel.scrollHeight;
  }
};
clearLogsBtn.onclick = () => {
  logs = [];
  logPanel.innerHTML = "";
  log("Logs cleared");
};

// Initialize UI with memory
(function init() {
  const m = loadMemory();
  nameEl.value = m.name || "";
  toneEl.value = m.tone || "friendly";
  renderMessage(
    "Welcome to MCP Demo — Tools + Memory + Safety (try the examples)",
    "bot"
  );
  log("App initialized");
})();
