import { Eye, FileText, Trash2, UploadCloud, X } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { deleteDocument, getChunks, getTask, uploadDocument } from "../api/client.js";
import Alert from "../components/Alert.jsx";
import Spinner from "../components/Spinner.jsx";
import StatusPill from "../components/StatusPill.jsx";

const acceptedTypes = ".pdf,.docx,.txt";

export default function Documents({ documents = [], onRefresh, onDocumentDeleted }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [confirmDocument, setConfirmDocument] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!uploadResult?.task_id || ["completed", "failed"].includes(task?.status)) return undefined;
    const id = window.setInterval(async () => {
      try {
        const nextTask = await getTask(uploadResult.task_id);
        setTask(nextTask);
        if (["completed", "failed"].includes(nextTask?.status)) {
          await onRefresh?.();
        }
      } catch (pollError) {
        setError(pollError.message);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [uploadResult?.task_id, task?.status, onRefresh]);

  function chooseFile(nextFile) {
    setError("");
    if (!nextFile) return;
    const ext = nextFile.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "txt"].includes(ext)) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }
    setFile(nextFile);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setTask(null);
    try {
      const result = await uploadDocument(file);
      setUploadResult(result);
      if (result?.task_id) {
        setTask(await getTask(result.task_id));
      }
      await onRefresh?.();
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function viewChunks(document) {
    setSelectedDocument(document);
    setChunks([]);
    setChunksLoading(true);
    setError("");
    try {
      setChunks(await getChunks(document.id));
    } catch (chunkError) {
      setError(chunkError.message);
    } finally {
      setChunksLoading(false);
    }
  }

  async function confirmDelete() {
    if (!confirmDocument?.id) return;
    setDeletingId(confirmDocument.id);
    setError("");
    try {
      await deleteDocument(confirmDocument.id);
      onDocumentDeleted?.(confirmDocument.id);
      if (selectedDocument?.id === confirmDocument.id) {
        setSelectedDocument(null);
        setChunks([]);
      }
      if (uploadResult?.document_id === confirmDocument.id) {
        setUploadResult(null);
        setTask(null);
      }
      setConfirmDocument(null);
      await onRefresh?.();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="space-y-6">
        <Alert message={error} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Upload document</h2>
              <p className="mt-1 text-sm text-slate-500">Add a PDF, DOCX, or TXT file for async parsing and indexing.</p>
            </div>
            <button
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!file || uploading}
              onClick={handleUpload}
            >
              {uploading ? <Spinner label="Uploading" /> : "Upload"}
            </button>
          </div>

          <div
            className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud className="mx-auto text-slate-400" size={36} />
            <p className="mt-3 text-sm font-semibold text-slate-800">Drop a file here or browse</p>
            <p className="mt-1 text-xs text-slate-500">Supported formats: PDF, DOCX, TXT</p>
            <input ref={inputRef} className="mt-4 text-sm" type="file" accept={acceptedTypes} onChange={(event) => chooseFile(event.target.files?.[0])} />
            {file ? <p className="mt-3 text-sm text-slate-600">Selected: <span className="font-medium">{file.name}</span></p> : null}
          </div>

          {uploadResult ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Filename" value={file?.name || uploadResult.filename || "Uploaded file"} />
                <Detail label="Status" value={<StatusPill status={task?.status || uploadResult.status} />} />
                <Detail label="Document ID" value={uploadResult.document_id} mono />
                <Detail label="Task ID" value={uploadResult.task_id} mono />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                  <span>Progress</span>
                  <span>{task?.progress ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${Math.min(task?.progress ?? 0, 100)}%` }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Document library</h2>
              <p className="mt-1 text-sm text-slate-500">Indexed source files available for retrieval.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {documents.map((document) => (
              <article className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" key={document.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="shrink-0 text-slate-500" size={18} />
                      <h3 className="truncate font-semibold text-slate-950">{document.filename || "Untitled document"}</h3>
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-500">{document.id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={document.status} />
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 shadow-sm hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={deletingId === document.id}
                      title="Delete document"
                      onClick={() => setConfirmDocument(document)}
                    >
                      {deletingId === document.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Created {formatDate(document.created_at)}</p>
                <button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm" onClick={() => viewChunks(document)}>
                  <Eye size={15} />
                  View Chunks
                </button>
              </article>
            ))}
            {!documents.length ? <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No documents uploaded yet.</p> : null}
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-950">Chunk drawer</h2>
        <p className="mt-1 truncate text-sm text-slate-500">{selectedDocument?.filename || "Select a document to inspect extracted chunks."}</p>
        <div className="mt-5 max-h-[680px] space-y-3 overflow-auto pr-1">
          {chunksLoading ? <Spinner label="Loading chunks" /> : null}
          {!chunksLoading &&
            chunks.map((chunk) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={chunk.id}>
                <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-500">
                  <span>Chunk {Number(chunk.chunk_index ?? 0) + 1}</span>
                  <span>{chunk.page_number ? `Page ${chunk.page_number}` : "No page"}</span>
                  <span>{chunk.token_count ?? "n/a"} tokens</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{preview(chunk.text, 420)}</p>
              </article>
            ))}
          {!chunksLoading && selectedDocument && !chunks.length ? <p className="text-sm text-slate-500">No chunks returned for this document.</p> : null}
        </div>
      </aside>

      {confirmDocument ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Delete this document?</h2>
                <p className="mt-2 text-sm text-slate-500">{confirmDocument.filename || "Untitled document"}</p>
              </div>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setConfirmDocument(null)} disabled={Boolean(deletingId)}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold">This will permanently remove:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>document metadata</li>
                <li>chunks</li>
                <li>vector embeddings</li>
                <li>associated retrieval data</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="secondary-button" onClick={() => setConfirmDocument(null)} disabled={Boolean(deletingId)}>
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? <Spinner label="Deleting..." /> : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-1 break-all text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "n/a"}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "n/a" : date.toLocaleString();
}

function preview(text = "", length) {
  return text.length > length ? `${text.slice(0, length)}...` : text || "No text preview available.";
}
