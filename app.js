/* MCP Demo Advanced - app.js
   Features:
   - Memory (localStorage)
   - Tools: time + calculator (calc)
   - Safety filter for unsafe keywords
   - Simple logging and observability
*/

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

// Tools
function tool_time() {
  log("Tool called: time");
  return new Date().toLocaleString();
}
function tool_calc(expr) {
  log("Tool called: calc", { detail: expr });
  // VERY simple safe calculator parser: allow digits, spaces, + - * / ( ) . %
  // Block any letters or other characters
  if (/[^0-9+\-*/(). %]/.test(expr)) {
    throw new Error("Invalid characters in expression");
  }
  // Simple eval in controlled environment
  try {
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    if (typeof result === "number" && isFinite(result)) return result;
    throw new Error("Invalid calculation result");
  } catch (e) {
    throw new Error("Calculation error");
  }
}

// Safety (very simple demo)
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

// Orchestrator / assistant
function assistantRespond(input) {
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

  // 5. Tools: calculator -- triggers when message starts with "calc " or "calculate "
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

  // Default: generate a reply based on tone
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

// UI events
sendBtn.onclick = () => {
  const txt = msgEl.value.trim();
  if (!txt) return;
  renderMessage(txt, "user");
  msgEl.value = "";
  // simulate processing
  setTimeout(() => {
    const out = assistantRespond(txt);
    renderMessage(out, "bot");
  }, 350);
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
