/**
 * Backend API wrapper.
 * - chatQuery: non-streaming (kept for fallback)
 * - chatStream: streaming via SSE, calls callbacks as events arrive
 * - healthCheck: ping the backend
 */
const API_URL = "http://localhost:8000";

export async function chatQuery(query) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Streaming chat. Calls callbacks as SSE events arrive.
 *
 * @param {string} query
 * @param {object} handlers
 *   - onSources(sources)  : called once when sources arrive
 *   - onToken(text)       : called many times as tokens stream in
 *   - onDone(info)        : called once at the end
 *   - onError(message)    : called on any error
 */
export async function chatStream(query, { onSources, onToken, onDone, onError }) {
  let response;
  try {
    response = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    onError?.(`Network error: ${e.message}`);
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events separated by blank line: "\n\n"
      let sepIndex;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        parseAndDispatch(rawEvent, { onSources, onToken, onDone, onError });
      }
    }

    // Flush any trailing event in buffer
    if (buffer.trim()) {
      parseAndDispatch(buffer, { onSources, onToken, onDone, onError });
    }
  } catch (e) {
    onError?.(`Stream read error: ${e.message}`);
  }
}

function parseAndDispatch(rawEvent, { onSources, onToken, onDone, onError }) {
  // Parse the SSE block of form:
  //   event: <name>
  //   data: <json>
  const lines = rawEvent.split("\n");
  let eventName = null;
  let dataStr = null;
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataStr = line.slice(5).trim();
    }
  }
  if (!eventName || dataStr === null) return;

  let data;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return;
  }

  switch (eventName) {
    case "sources":
      onSources?.(data.sources || []);
      break;
    case "token":
      onToken?.(data.text || "");
      break;
    case "done":
      onDone?.(data || {});
      break;
    case "error":
      onError?.(data.message || "Unknown server error");
      break;
  }
}

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}