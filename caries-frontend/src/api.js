const env = import.meta.env || {};
const API_BASE_URL = (
  env.VITE_API_BASE_URL ||
  env.REACT_APP_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || `Request failed with status ${response.status}`;
    if (typeof detail === "string" && detail.includes("USDA_API_KEY")) {
      throw new Error("USDA food search is not configured. Add USDA_API_KEY to the backend .env file.");
    }
    if (typeof detail === "string" && detail.includes("GOOGLE_API_KEY")) {
      throw new Error("Image food detection is not configured. Add GOOGLE_API_KEY to the backend .env file.");
    }
    throw new Error(detail);
  }

  return data;
}

export { API_BASE_URL };
