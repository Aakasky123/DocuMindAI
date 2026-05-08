import { BarChart3, Database, FileText, MessageSquare, Wifi, WifiOff } from "lucide-react";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { getConfig, getDocuments, getEvaluationRuns, getHealth } from "./api/client.js";
import StatusPill from "./components/StatusPill.jsx";
import Chat from "./pages/Chat.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Documents from "./pages/Documents.jsx";
import Evaluation from "./pages/Evaluation.jsx";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "evaluation", label: "Evaluation", icon: Database }
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [documents, setDocuments] = useState([]);
  const [evaluationRuns, setEvaluationRuns] = useState([]);
  const [config, setConfig] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const activeItem = useMemo(() => navItems.find((item) => item.id === active) || navItems[0], [active]);
  const ActiveIcon = activeItem.icon;

  async function refreshDocuments() {
    try {
      setDocuments(await getDocuments());
      setGlobalError("");
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  async function refreshEvaluation() {
    try {
      setEvaluationRuns(await getEvaluationRuns());
    } catch {
      setEvaluationRuns([]);
    }
  }

  async function refreshSystem() {
    try {
      await getHealth();
      setApiOnline(true);
      setConfig(await getConfig().catch(() => null));
    } catch {
      setApiOnline(false);
    }
  }

  function handleDocumentDeleted(documentId) {
    setDocuments((current) => current.filter((document) => document.id !== documentId));
  }

  useEffect(() => {
    refreshSystem();
    refreshDocuments();
    refreshEvaluation();
    const id = window.setInterval(() => {
      refreshSystem();
      refreshDocuments();
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col bg-slate-950 text-white shadow-2xl lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-lg">D</div>
            <div>
              <p className="text-lg font-semibold">DocuMind AI</p>
              <p className="text-xs text-slate-400">RAG Intelligence</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                key={item.id}
                onClick={() => setActive(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-5 text-xs leading-5 text-slate-400">
          Production-grade RAG app with async ingestion, retrieval, answer generation, and citations.
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <ActiveIcon className="text-slate-500" size={22} />
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">DocuMind AI</h1>
                </div>
                <p className="mt-1 text-sm text-slate-500">Production-Grade RAG Document Intelligence Assistant</p>
              </div>
              <div className="flex items-center gap-3">
                {apiOnline ? <Wifi className="text-emerald-600" size={18} /> : <WifiOff className="text-rose-600" size={18} />}
                <StatusPill status={apiOnline ? "online" : "offline"} />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${active === item.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
                  key={item.id}
                  onClick={() => setActive(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 xl:px-8">
          {active === "dashboard" && (
            <Dashboard documents={documents} evaluationRuns={evaluationRuns} config={config} apiOnline={apiOnline} error={globalError} />
          )}
          {active === "documents" && <Documents documents={documents} onRefresh={refreshDocuments} onDocumentDeleted={handleDocumentDeleted} />}
          {active === "chat" && <Chat documents={documents.filter((doc) => doc?.status === "completed")} />}
          {active === "evaluation" && <Evaluation runs={evaluationRuns} onRefresh={refreshEvaluation} />}
        </main>
      </div>
    </div>
  );
}
