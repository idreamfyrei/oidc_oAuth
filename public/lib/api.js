const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("Something went wrong on our side. Please try again in a moment.");
    }

    const message =
      payload?.message || payload?.error_description || payload?.error || "Request failed.";
    throw new Error(message);
  }

  return payload;
};

export const apiGet = (url) => apiRequest(url);
export const apiPost = (url, body) =>
  apiRequest(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
