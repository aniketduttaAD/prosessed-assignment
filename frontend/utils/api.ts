const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type Options = {
  method?: string;
  body?: string;
};

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data?.message) {
        message = data.message;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to parse error response", error);
      }
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

