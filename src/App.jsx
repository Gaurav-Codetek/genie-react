import { AlertCircle, Bot, Loader2, RefreshCcw, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const emptyConfig = {
  databricksHost: "",
  servingEndpoint: "",
  forwardedUserTokenPresent: false,
  requestFormat: "responses"
};

function StatusPill({ value }) {
  return (
    <span className={value ? "pill pill-ok" : "pill pill-warn"}>
      {value ? "Present" : "Missing"}
    </span>
  );
}

function MessageBubble({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message ${isAssistant ? "assistant" : "user"}`}>
      <div className="avatar" aria-hidden="true">
        {isAssistant ? <Bot size={18} /> : <UserRound size={18} />}
      </div>
      <div className="bubble">
        <div className="message-role">{isAssistant ? "Supervisor agent" : "You"}</div>
        <div className="message-content">{message.content}</div>
      </div>
    </article>
  );
}

function DebugPanel({ config, rawResponse, request }) {
  const rows = useMemo(
    () => [
      ["Databricks host", config.databricksHost || "Not configured"],
      ["Serving endpoint", config.servingEndpoint || "Not configured"],
      ["Forwarded user token", <StatusPill value={config.forwardedUserTokenPresent} />],
      ["Request format", config.requestFormat || "responses"]
    ],
    [config]
  );

  return (
    <aside className="debug-panel">
      <div className="panel-heading">
        <span>Runtime</span>
      </div>
      <dl className="runtime-list">
        {rows.map(([label, value]) => (
          <div className="runtime-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {(rawResponse || request) && (
        <details className="raw-response">
          <summary>Raw response</summary>
          {request && (
            <>
              <div className="debug-label">Request</div>
              <pre>{JSON.stringify(request, null, 2)}</pre>
            </>
          )}
          {rawResponse && (
            <>
              <div className="debug-label">Response</div>
              <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
            </>
          )}
        </details>
      )}
    </aside>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(emptyConfig);
  const [rawResponse, setRawResponse] = useState(null);
  const [request, setRequest] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data) => setConfig({ ...emptyConfig, ...data }))
      .catch(() => {
        setError("Could not load app configuration from the backend.");
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(event) {
    event.preventDefault();

    const content = input.trim();
    if (!content || loading) {
      return;
    }

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: nextMessages })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
      }

      setMessages((currentMessages) => [...currentMessages, data.message]);
      setRawResponse(data.rawResponse || null);
      setRequest(data.request || null);
      setConfig({ ...emptyConfig, ...(data.config || config) });
    } catch (chatError) {
      setError(chatError.message || "The supervisor agent request failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setMessages([]);
    setInput("");
    setError("");
    setRawResponse(null);
    setRequest(null);
  }

  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="Supervisor agent chat">
        <header className="chat-header">
          <div>
            <div className="eyebrow">Databricks Apps</div>
            <h1>Supervisor Agent Chat</h1>
          </div>
          <button className="icon-button secondary" type="button" onClick={resetConversation}>
            <RefreshCcw size={17} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </header>

        <div className="conversation">
          {messages.length === 0 && (
            <div className="empty-state">
              <Bot size={28} aria-hidden="true" />
              <p>Ask the supervisor agent a question.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} message={message} />
          ))}

          {loading && (
            <article className="message assistant">
              <div className="avatar" aria-hidden="true">
                <Loader2 className="spin" size={18} />
              </div>
              <div className="bubble">
                <div className="message-role">Supervisor agent</div>
                <div className="message-content muted">Thinking...</div>
              </div>
            </article>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form className="composer" onSubmit={sendMessage}>
          <textarea
            aria-label="Message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                sendMessage(event);
              }
            }}
            placeholder="Message the supervisor agent"
            rows={1}
          />
          <button className="icon-button primary" type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            <span>Send</span>
          </button>
        </form>
      </section>

      <DebugPanel config={config} rawResponse={rawResponse} request={request} />
    </main>
  );
}
