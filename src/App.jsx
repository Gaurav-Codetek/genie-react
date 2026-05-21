import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════
   SVG ICONS (inline, no dependency)
   ═══════════════════════════════════════════════ */
function IconMessageSquarePlus(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M12 7v6"/><path d="M9 10h6"/>
    </svg>
  );
}

function IconMoreVertical(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
  );
}

function IconPencil(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}

function IconSend(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18.168-8.215a.5.5 0 0 0 0-.904z"/>
      <path d="M6 12h16"/>
    </svg>
  );
}

function IconSun(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  );
}

function IconMoon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  );
}

function IconChevronDown(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   THREAD MANAGEMENT (localStorage)
   ═══════════════════════════════════════════════ */
const STORAGE_KEY = "hq_insight.threads.v2";
const DEFAULT_SLUG = "intelliegencedatacatalog.temp.testing_agent";
const AUTO_PREFIX = "New chat - ";

function now() {
  return Date.now();
}

function makeId() {
  return Math.random().toString(36).slice(2, 10) + now().toString(36);
}

function formatStamp(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createNewThread(name) {
  const ts = now();
  return {
    id: makeId(),
    name: name || `${AUTO_PREFIX}${formatStamp(ts)}`,
    slug: DEFAULT_SLUG,
    version: "v2",
    createdAt: ts,
    updatedAt: ts,
    messages: [],
  };
}

function loadThreads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === "object" && t.id)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

function saveThreads(threads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

function createMessage(role, content) {
  return { id: makeId(), role, content: content.trim(), createdAt: now() };
}

function isAutoName(name) {
  return name.startsWith(AUTO_PREFIX);
}

function deriveThreadName(content) {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) return `${AUTO_PREFIX}${formatStamp(now())}`;
  return normalized.length <= 48 ? normalized : `${normalized.slice(0, 45)}...`;
}

function groupByMonth(threads) {
  const groups = new Map();
  const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const t of sorted) {
    const d = new Date(t.updatedAt);
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t);
  }
  return Array.from(groups, ([label, items]) => ({ label, items }));
}

/* ── useThreads hook ── */
function useThreads() {
  const [threads, setThreads] = useState(() => loadThreads());
  const [ready, setReady] = useState(false);
  const threadsRef = useRef(threads);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    setThreads(loadThreads());
    setReady(true);
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setThreads(loadThreads());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next) => {
    threadsRef.current = next;
    setThreads(next);
    saveThreads(next);
  }, []);

  const create = useCallback(() => {
    const t = createNewThread();
    persist([t, ...threadsRef.current]);
    return t;
  }, [persist]);

  const remove = useCallback(
    (id) => {
      persist(threadsRef.current.filter((t) => t.id !== id));
    },
    [persist]
  );

  const rename = useCallback(
    (id, name) => {
      persist(
        threadsRef.current.map((t) =>
          t.id === id ? { ...t, name, updatedAt: Date.now() } : t
        )
      );
    },
    [persist]
  );

  const updateThread = useCallback(
    (id, updater) => {
      let updated;
      const next = threadsRef.current.map((thread) => {
        if (thread.id !== id) return thread;
        updated = updater(thread);
        return updated;
      });
      persist(next);
      return updated;
    },
    [persist]
  );

  return { threads, ready, create, remove, rename, updateThread };
}

/* ── useTheme hook ── */
function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("hq_insight.theme");
    if (stored === "light") return false;
    if (stored === "dark") return true;
    return true; // default dark
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("hq_insight.theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return { dark, toggle };
}

/* ═══════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════ */

/* ── Thread Dropdown ── */
function ThreadDropdown({ threadId, onRename, onDelete, onClose }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="thread-dropdown" ref={dropdownRef}>
      <button
        className="thread-dropdown-item"
        onClick={() => {
          onRename(threadId);
          onClose();
        }}
      >
        <IconPencil /> Rename
      </button>
      <button
        className="thread-dropdown-item destructive"
        onClick={() => {
          onDelete(threadId);
          onClose();
        }}
      >
        <IconTrash /> Delete
      </button>
    </div>
  );
}

/* ── Sidebar ── */
function AppSidebar({ threads, activeId, onSelect, onNew, onDelete, onRename }) {
  const [openMenu, setOpenMenu] = useState(null);
  const groups = useMemo(() => groupByMonth(threads), [threads]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <h1 className="sidebar-title">HQ_Insight</h1>
          <span className="sidebar-badge">Dev</span>
        </div>
        <p className="sidebar-tagline">Chat with agents</p>
      </div>

      <div className="sidebar-actions">
        <button className="btn-new-chat" onClick={onNew} id="new-chat-btn">
          <IconMessageSquarePlus /> New chat
        </button>
      </div>

      <div className="sidebar-threads">
        {groups.map((group) => (
          <div key={group.label} className="thread-group">
            <div className="thread-group-label">{group.label}</div>
            <ul className="thread-list">
              {group.items.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <div className={`thread-item${isActive ? " active" : ""}`}>
                      <div
                        className="thread-link"
                        onClick={() => onSelect(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelect(t.id);
                        }}
                      >
                        <div className="thread-name">
                          {t.name} — {formatStamp(t.updatedAt)}
                        </div>
                        <div className="thread-meta">
                          <span className="thread-slug">{t.slug}</span>
                          <span className="thread-version">{t.version}</span>
                        </div>
                      </div>
                      <button
                        className="thread-menu-btn"
                        aria-label="Thread options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === t.id ? null : t.id);
                        }}
                      >
                        <IconMoreVertical />
                      </button>
                      {openMenu === t.id && (
                        <ThreadDropdown
                          threadId={t.id}
                          onRename={onRename}
                          onDelete={(id) => {
                            onDelete(id);
                            if (isActive) onSelect(null);
                          }}
                          onClose={() => setOpenMenu(null)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ── Rich Message Content Parser ── */

function formatNumber(str) {
  const num = Number(str);
  if (isNaN(num)) return str;
  // Format with commas and up to 2 decimal places
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatted;
}

function parseTable(lines) {
  // lines = array of pipe-delimited rows
  // First row = header, second row = separator, rest = data
  const parseRow = (line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  // Skip separator row (lines[1])
  const dataRows = lines.slice(2).map(parseRow);

  // Detect if a column looks numeric
  const isNumericCol = headers.map((_, i) =>
    dataRows.length > 0 && dataRows.every((row) => row[i] === undefined || row[i] === "" || !isNaN(Number(row[i])))
  );

  return { headers, dataRows, isNumericCol };
}

function RichMessageContent({ text }) {
  const blocks = useMemo(() => {
    if (!text) return [{ type: "text", content: "" }];

    const result = [];
    const lines = text.split("\n");
    let i = 0;
    let currentText = [];

    const flushText = () => {
      if (currentText.length > 0) {
        result.push({ type: "text", content: currentText.join("\n") });
        currentText = [];
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block (```)
      if (line.trimStart().startsWith("```")) {
        flushText();
        const lang = line.trimStart().slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        result.push({ type: "code-block", lang, content: codeLines.join("\n") });
        i++; // skip closing ```
        continue;
      }

      // Table detection: line starts/ends with | or has multiple |
      const isTableRow = (l) => {
        const trimmed = l.trim();
        return (trimmed.startsWith("|") || trimmed.includes("|")) &&
          (trimmed.match(/\|/g) || []).length >= 2;
      };
      const isSeparator = (l) => /^\|?[\s-:|]+\|?$/.test(l.trim());

      if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
        flushText();
        const tableLines = [];
        while (i < lines.length && (isTableRow(lines[i]) || isSeparator(lines[i]))) {
          tableLines.push(lines[i]);
          i++;
        }
        if (tableLines.length >= 2) {
          result.push({ type: "table", ...parseTable(tableLines) });
        } else {
          currentText.push(...tableLines);
        }
        continue;
      }

      currentText.push(line);
      i++;
    }

    flushText();
    return result;
  }, [text]);

  return (
    <div className="rich-content">
      {blocks.map((block, idx) => {
        if (block.type === "code-block") {
          return (
            <div key={idx} className="rich-code-block">
              {block.lang && <div className="rich-code-lang">{block.lang}</div>}
              <pre><code>{block.content}</code></pre>
            </div>
          );
        }

        if (block.type === "table") {
          return (
            <div key={idx} className="rich-table-wrapper">
              <table className="rich-table">
                <thead>
                  <tr>
                    {block.headers.map((h, hi) => (
                      <th key={hi} className={block.isNumericCol[hi] ? "num-col" : ""}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.dataRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={block.isNumericCol[ci] ? "num-col" : ""}>
                          {block.isNumericCol[ci] ? formatNumber(cell) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // "text" block — render inline formatting
        return <RichTextBlock key={idx} content={block.content} />;
      })}
    </div>
  );
}

function RichTextBlock({ content }) {
  // Split into paragraphs by double newline
  const paragraphs = content.split(/\n{2,}/);

  return (
    <>
      {paragraphs.map((para, pi) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Unordered list
        const ulLines = trimmed.split("\n");
        if (ulLines.every((l) => /^[\s]*[-*•]\s/.test(l))) {
          return (
            <ul key={pi} className="rich-ul">
              {ulLines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[\s]*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Ordered list
        if (ulLines.every((l) => /^[\s]*\d+[.)]\s/.test(l))) {
          return (
            <ol key={pi} className="rich-ol">
              {ulLines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[\s]*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={pi} className="rich-para">
            {renderInline(trimmed.replace(/\n/g, " "))}
          </p>
        );
      })}
    </>
  );
}

function renderInline(text) {
  // Split by inline patterns: **bold**, `code`
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<React.Fragment key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
    }
    if (match[2]) {
      // Bold
      parts.push(<strong key={`b${match.index}`} className="rich-bold">{match[2]}</strong>);
    } else if (match[3]) {
      // Inline code
      parts.push(<code key={`c${match.index}`} className="rich-inline-code">{match[3]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`t${lastIndex}`}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return parts.length > 0 ? parts : text;
}

/* ── Message Bubble ── */
function MessageBubble({ message }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`message-row ${isAssistant ? "assistant" : "user"} fade-in`}>
      <div className="message-bubble">
        <div className="message-role">{isAssistant ? "Assistant" : "You"}</div>
        {isAssistant ? (
          <div className="message-text">
            <RichMessageContent text={message.content} />
          </div>
        ) : (
          <div className="message-text">{message.content}</div>
        )}
      </div>
    </div>
  );
}

/* ── Loading Bubble ── */
function LoadingBubble() {
  return (
    <div className="message-row assistant fade-in">
      <div className="message-bubble">
        <div className="message-role">Assistant</div>
        <div className="loading-dots">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    </div>
  );
}

/* ── Conversation Intro ── */
function ConversationIntro({ config, hasAuthError }) {
  return (
    <div className="conversation-intro">
      <div className="intro-card">
        <div className="intro-top">
          <div>
            <h2 className="intro-heading">Ask the configured Databricks agent</h2>
            <p className="intro-desc">
              Messages are sent from the app server to your serving endpoint
              using the signed-in Databricks Apps user context.
            </p>
          </div>
          <div className="intro-format-badge">
            <div className="intro-format-label">Request format</div>
            <div className="intro-format-value">
              {config?.requestFormat ?? "responses"}
            </div>
          </div>
        </div>

        <div className="intro-cards-row">
          <div className="intro-info-card">
            <div className="intro-info-label">Databricks host</div>
            <div className="intro-info-value">
              {config?.databricksHost || "Not configured yet"}
            </div>
          </div>
          <div className="intro-info-card">
            <div className="intro-info-label">Serving endpoint</div>
            <div className="intro-info-value">
              {config?.servingEndpoint || "Not configured yet"}
            </div>
          </div>
        </div>

        {hasAuthError && (
          <div className="intro-auth-warning">
            Databricks Apps user authorization is not available on this request
            yet. If you are testing locally, this is expected until the app runs
            inside Databricks Apps with the <code>model-serving</code> scope
            enabled.
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */
const emptyConfig = {
  databricksHost: "",
  servingEndpoint: "",
  forwardedUserTokenPresent: false,
  requestFormat: "responses",
};

export default function App() {
  const { threads, ready, create, remove, rename, updateThread } = useThreads();
  const { dark, toggle: toggleTheme } = useTheme();

  const [activeThreadId, setActiveThreadId] = useState(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(emptyConfig);
  const [diagnosticsByThread, setDiagnosticsByThread] = useState({});

  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  const active = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId]
  );

  const activeDiagnostics = active ? diagnosticsByThread[active.id] : undefined;

  // Auto-select the newest thread on first load
  useEffect(() => {
    if (!ready) return;
    if (!activeThreadId && threads.length > 0) {
      const newest = [...threads].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveThreadId(newest.id);
    }
  }, [ready, activeThreadId, threads]);

  // Load config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setConfig({ ...emptyConfig, ...data }))
      .catch(() => {});
  }, []);

  // Focus textarea on thread change
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeThreadId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThreadId, active?.messages?.length, isSending]);

  // ── Handlers ──
  const handleNewThread = () => {
    const t = create();
    setError(null);
    setActiveThreadId(t.id);
  };

  const handleRenameThread = (id) => {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;
    const next = window.prompt("Rename conversation", thread.name);
    if (next && next.trim()) {
      rename(id, next.trim());
    }
  };

  const handleDeleteThread = (id) => {
    remove(id);
    if (activeThreadId === id) {
      const remaining = threads.filter((t) => t.id !== id);
      setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    let targetThread = active;
    if (!targetThread) {
      targetThread = create();
      setActiveThreadId(targetThread.id);
    }

    const userMessage = createMessage("user", content);
    const nextHistory = [...targetThread.messages, userMessage];

    updateThread(targetThread.id, (thread) => ({
      ...thread,
      name:
        thread.messages.length === 0 && isAutoName(thread.name)
          ? deriveThreadName(content)
          : thread.name,
      updatedAt: userMessage.createdAt,
      messages: [...thread.messages, userMessage],
    }));

    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
      }

      const assistantMessage = createMessage("assistant", data.message?.content || "");

      updateThread(targetThread.id, (thread) => ({
        ...thread,
        updatedAt: assistantMessage.createdAt,
        messages: [...thread.messages, assistantMessage],
      }));

      setDiagnosticsByThread((prev) => ({
        ...prev,
        [targetThread.id]: {
          request: data.request || null,
          rawResponse: data.rawResponse || null,
        },
      }));
      setConfig({ ...emptyConfig, ...(data.config || config) });
    } catch (err) {
      setError(err.message || "The Databricks request failed.");
      // Try to refresh config
      fetch("/api/config")
        .then((r) => r.json())
        .then((d) => setConfig({ ...emptyConfig, ...d }))
        .catch(() => {});
    } finally {
      setIsSending(false);
    }
  };

  const canSend = draft.trim().length > 0 && !isSending;
  const authReady = Boolean(config?.forwardedUserTokenPresent);

  function renderJson(value) {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar
        threads={threads}
        activeId={activeThreadId}
        onSelect={setActiveThreadId}
        onNew={handleNewThread}
        onDelete={handleDeleteThread}
        onRename={handleRenameThread}
      />

      <main className="main-panel">
        {/* ── Header bar ── */}
        <header className="chat-header">
          <div className="header-left" />

          <div className="header-center">
            <div className="endpoint-selector" id="endpoint-selector">
              {config?.servingEndpoint || DEFAULT_SLUG}
              <IconChevronDown style={{ marginLeft: 6, opacity: 0.5 }} />
            </div>
          </div>

          <div className="header-right">
            <span className="header-badge" id="format-badge">
              {config?.requestFormat ?? "responses"}
            </span>
            <span
              className={`header-badge auth-badge${authReady ? "" : " missing"}`}
              id="auth-badge"
            >
              {authReady ? "Auth ready" : "Auth missing"}
            </span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              id="theme-toggle-btn"
            >
              {dark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>

        {/* ── Conversation body ── */}
        <section className="conversation-area" aria-label="Conversation">
          {!active && ready && threads.length === 0 ? (
            <ConversationIntro config={config} hasAuthError={Boolean(error)} />
          ) : active ? (
            <div className="conversation-content">
              {/* Endpoint info bar */}
              <div className="endpoint-bar">
                <div className="endpoint-bar-inner">
                  <div className="endpoint-bar-section">
                    <div className="endpoint-bar-label">Serving endpoint</div>
                    <div className="endpoint-bar-value">
                      {config?.servingEndpoint || "Not configured"}
                    </div>
                  </div>
                  <div className="endpoint-bar-divider" />
                  <div className="endpoint-bar-section">
                    <div className="endpoint-bar-label">Databricks host</div>
                    <div className="endpoint-bar-value">
                      {config?.databricksHost || "Not configured"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="error-banner" role="alert" id="error-banner">
                  {error}
                </div>
              )}

              {/* Messages */}
              <div className="messages-area">
                {active.messages.length === 0 ? (
                  <ConversationIntro config={config} hasAuthError={!authReady} />
                ) : (
                  active.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
                {isSending && <LoadingBubble />}
                <div ref={bottomRef} />
              </div>

              {/* Diagnostics */}
              {activeDiagnostics && (
                <details className="diagnostics" id="diagnostics-panel">
                  <summary>Request diagnostics</summary>
                  <div className="diagnostics-body">
                    <div className="diagnostics-label">Payload</div>
                    <pre>{renderJson(activeDiagnostics.request)}</pre>
                    <div className="diagnostics-label">Raw response</div>
                    <pre>{renderJson(activeDiagnostics.rawResponse)}</pre>
                  </div>
                </details>
              )}
            </div>
          ) : null}
        </section>

        {/* ── Composer ── */}
        <footer className="composer-wrapper">
          <form className="composer" onSubmit={sendMessage} id="chat-form">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message the Databricks agent"
              rows={1}
              aria-label="Message"
              id="chat-input"
            />
            <button
              type="submit"
              className="composer-send"
              disabled={!canSend}
              aria-label="Send message"
              id="send-btn"
            >
              <IconSend />
            </button>
          </form>
          <p className="composer-disclaimer">Always review the accuracy of responses</p>
        </footer>
      </main>
    </div>
  );
}
