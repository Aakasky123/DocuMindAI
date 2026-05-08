import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000
});

function messageFromError(error) {
  return error?.response?.data?.detail || error?.message || "Something went wrong.";
}

export async function getHealth() {
  try {
    const { data } = await api.get("/health");
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function getConfig() {
  try {
    const { data } = await api.get("/config");
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function getDocuments() {
  try {
    const { data } = await api.get("/documents");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function uploadDocument(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/documents/upload", formData);
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function getTask(taskId) {
  try {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function getChunks(documentId) {
  try {
    const { data } = await api.get(`/documents/${documentId}/chunks`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function askQuestion(payload) {
  try {
    const { data } = await api.post("/chat/ask", payload);
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function streamQuestion(payload, handlers = {}) {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = `Streaming request failed with status ${response.status}.`;
    try {
      const errorPayload = await response.json();
      detail = errorPayload.detail || detail;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(detail);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      handleSseBlock(block, handlers);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    handleSseBlock(buffer, handlers);
  }
}

function handleSseBlock(block, handlers) {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (!dataLines.length) return;

  let data;
  const rawData = dataLines.join("\n");
  try {
    data = JSON.parse(rawData);
  } catch {
    data = { text: rawData };
  }

  if (event === "metadata") handlers.onMetadata?.(data);
  if (event === "citation") handlers.onCitation?.(data);
  if (event === "token") handlers.onToken?.(data.text || "");
  if (event === "done") handlers.onDone?.(data);
  if (event === "error") {
    const error = new Error(data.message || "Streaming failed.");
    handlers.onError?.(error);
    throw error;
  }
}

export async function getEvaluationRuns() {
  try {
    const { data } = await api.get("/evaluation/runs");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export async function deleteDocument(documentId) {
  try {
    const { data } = await api.delete(`/documents/${documentId}`);
    return data;
  } catch (error) {
    throw new Error(messageFromError(error));
  }
}

export const fetchDocuments = getDocuments;
export const fetchChunks = getChunks;
export const fetchTask = getTask;
export const fetchEvaluationRuns = getEvaluationRuns;
