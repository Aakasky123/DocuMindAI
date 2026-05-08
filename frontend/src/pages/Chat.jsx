import { Check, Clipboard, MessageSquare, RotateCcw, Send } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { askQuestion, streamQuestion } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import Spinner from "../components/Spinner.jsx";

export default function Chat({ documents = [] }) {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [question, setQuestion] = useState("");
  const [retrievalMode, setRetrievalMode] = useState("hybrid");
  const [modelProvider, setModelProvider] = useState("openai");
  const [topK, setTopK] = useState(5);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const canAsk = question.trim().length > 0 && selectedDocuments.length > 0 && !loading;

  useEffect(() => {
    const availableIds = new Set(documents.map((document) => document.id));
    setSelectedDocuments((current) => current.filter((documentId) => availableIds.has(documentId)));
  }, [documents]);

  function toggleDocument(documentId) {
    setSelectedDocuments((current) => (current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]));
  }

  async function submitQuestion() {
    if (!canAsk) return;
    setLoading(true);
    setError("");
    const messageId = makeId();
    const payload = {
      question: question.trim(),
      document_ids: selectedDocuments,
      retrieval_mode: retrievalMode,
      model_provider: modelProvider,
      top_k: Number(topK) || 5
    };
    setQuestion("");
    setMessages((current) => [
      {
        id: messageId,
        question: payload.question,
        streaming: true,
        response: {
          answer: "",
          citations: [],
          latency_ms: null,
          model_provider: payload.model_provider,
          retrieval_mode: payload.retrieval_mode
        }
      },
      ...current
    ]);

    try {
      await streamQuestion(payload, {
        onMetadata: (metadata) => {
          updateMessage(messageId, (message) => ({
            ...message,
            response: {
              ...message.response,
              model_provider: metadata.model_provider || payload.model_provider,
              retrieval_mode: metadata.retrieval_mode || payload.retrieval_mode
            }
          }));
        },
        onCitation: (citation) => {
          updateMessage(messageId, (message) => ({
            ...message,
            response: {
              ...message.response,
              citations: mergeCitations(message.response?.citations || [], [citation])
            }
          }));
        },
        onToken: (text) => {
          updateMessage(messageId, (message) => ({
            ...message,
            response: {
              ...message.response,
              answer: `${message.response?.answer || ""}${text}`
            }
          }));
        },
        onDone: (done) => {
          updateMessage(messageId, (message) => ({
            ...message,
            streaming: false,
            response: {
              ...message.response,
              answer: message.response?.answer || "Retrieved relevant context, but no generated answer was returned.",
              latency_ms: done.latency_ms,
              model_provider: done.model_provider || message.response?.model_provider,
              retrieval_mode: done.retrieval_mode || message.response?.retrieval_mode,
              citations: mergeCitations(message.response?.citations || [], done.citations || [])
            }
          }));
        },
        onError: (streamError) => {
          setError(`${streamError.message} Trying non-streaming fallback...`);
        }
      });
    } catch (streamError) {
      try {
        const response = await askQuestion(payload);
        updateMessage(messageId, (message) => ({
          ...message,
          streaming: false,
          usedFallback: true,
          response
        }));
        setError("");
      } catch (fallbackError) {
        updateMessage(messageId, (message) => ({ ...message, streaming: false }));
        setError(`${streamError.message} Fallback also failed: ${fallbackError.message}`);
      }
    } finally {
      updateMessage(messageId, (message) => ({ ...message, streaming: false }));
      setLoading(false);
    }
  }

  function updateMessage(messageId, updater) {
    setMessages((current) => current.map((message) => (message.id === messageId ? updater(message) : message)));
  }

  async function copyAnswer(message) {
    const text = message?.response?.answer || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 1200);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28 xl:self-start">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Ask documents</h2>
          <p className="mt-1 text-sm text-slate-500">Select processed sources and submit a grounded question.</p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</label>
          <div className="mt-2 max-h-72 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
            {documents.map((document) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm shadow-sm" key={document.id}>
                <input className="mt-1" type="checkbox" checked={selectedDocuments.includes(document.id)} onChange={() => toggleDocument(document.id)} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{document.filename || "Untitled document"}</span>
                  <span className="block truncate font-mono text-xs text-slate-500">{document.id}</span>
                </span>
              </label>
            ))}
            {!documents.length ? <p className="p-3 text-sm text-slate-500">No completed documents are ready for chat.</p> : null}
          </div>
        </div>

        <Field label="Retrieval mode">
          <select className="input" value={retrievalMode} onChange={(event) => setRetrievalMode(event.target.value)}>
            <option value="hybrid">hybrid</option>
            <option value="vector">vector</option>
            <option value="keyword">keyword</option>
          </select>
        </Field>

        <Field label="Model provider">
          <select className="input" value={modelProvider} onChange={(event) => setModelProvider(event.target.value)}>
            <option value="openai">openai</option>
            <option value="ollama">ollama</option>
          </select>
        </Field>

        <Field label="Top K">
          <input className="input" min="1" max="20" type="number" value={topK} onChange={(event) => setTopK(event.target.value)} />
        </Field>
      </aside>

      <div className="space-y-5">
        <Alert message={error} />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <textarea
            className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white"
            placeholder="What are the termination risks in this contract?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{selectedDocuments.length} document{selectedDocuments.length === 1 ? "" : "s"} selected</p>
            <div className="flex gap-2">
              <button className="secondary-button" onClick={() => setMessages([])} disabled={!messages.length}>
                <RotateCcw size={16} />
                Clear chat
              </button>
              <button className="primary-button" onClick={submitQuestion} disabled={!canAsk}>
                {loading ? <Spinner label="Asking" /> : <><Send size={16} /> Ask</>}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {messages.map((message) => (
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={message.id}>
              <div className="border-b border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-1 shrink-0 text-slate-500" size={18} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</p>
                    <p className="mt-1 text-base font-medium text-slate-950">{message.question}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Answer</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                      {message.response?.answer || (message.streaming ? "Generating..." : "No answer returned.")}
                      {message.streaming ? <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-slate-800 align-middle" /> : null}
                    </p>
                    {message.streaming ? <p className="mt-3 text-xs font-semibold text-sky-700">Streaming response...</p> : null}
                    {message.usedFallback ? <p className="mt-3 text-xs font-semibold text-amber-700">Displayed via non-streaming fallback.</p> : null}
                  </div>
                  <button className="secondary-button shrink-0" onClick={() => copyAnswer(message)}>
                    {copiedId === message.id ? <Check size={16} /> : <Clipboard size={16} />}
                    {copiedId === message.id ? "Copied" : "Copy answer"}
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <Meta label="Latency" value={`${message.response?.latency_ms ?? "n/a"} ms`} />
                  <Meta label="Provider" value={message.response?.model_provider || "n/a"} />
                  <Meta label="Retrieval" value={message.response?.retrieval_mode || "n/a"} />
                </div>
                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  {(message.response?.citations || []).map((citation) => (
                    <Citation citation={citation} key={citation.chunk_id} />
                  ))}
                  {!message.response?.citations?.length ? <p className="text-sm text-slate-500">No citations returned.</p> : null}
                </div>
              </div>
            </article>
          ))}
          {!messages.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <MessageSquare className="mx-auto text-slate-300" size={40} />
              <p className="mt-3 font-semibold text-slate-800">No questions yet</p>
              <p className="mt-1 text-sm text-slate-500">Ask a question after selecting at least one completed document.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeCitations(existing, incoming) {
  const map = new Map();
  for (const citation of [...existing, ...incoming]) {
    if (!citation) continue;
    map.set(citation.chunk_id || `${citation.document_id}-${citation.text_preview}`, citation);
  }
  return Array.from(map.values());
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Meta({ label, value }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1">
      <span className="font-semibold text-slate-600">{label}:</span> {value}
    </span>
  );
}

function Citation({ citation }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-800">{citation.document_name || "Unknown document"}</span>
        <span className="rounded-full bg-white px-2 py-1 text-slate-500">{citation.page_number ? `Page ${citation.page_number}` : "No page"}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{citation.text_preview || "No preview returned."}</p>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>Score: {typeof citation.score === "number" ? citation.score.toFixed(3) : "n/a"}</p>
        <p className="break-all font-mono">Chunk: {citation.chunk_id || "n/a"}</p>
      </div>
    </article>
  );
}
