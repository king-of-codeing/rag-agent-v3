/**
 * Backend API wrapper.
 * Centralizes all calls to the FastAPI backend so the URL lives in one place.
 */
const API_URL = "http://localhost:8000";

export async function chatQuery(query) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json(); // { answer: string, sources: [...] }
}

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}