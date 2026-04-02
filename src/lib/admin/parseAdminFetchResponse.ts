/**
 * Admin UI often does `await res.json()`; Vercel returns plain-text 413 bodies
 * ("Request Entity Too Large") before our route runs, which breaks JSON.parse.
 */
export async function parseAdminJsonResponse<T = unknown>(
  res: Response
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();
  const trimmed = text.trim();

  if (res.status === 413 || /^request entity too large/i.test(trimmed)) {
    return {
      ok: false,
      message:
        "File too large for the server (about 4 MB max on Vercel). Compress or resize the image and try again.",
    };
  }

  if (!trimmed) {
    if (!res.ok) {
      return { ok: false, message: `Request failed (${res.status})` };
    }
    return { ok: true, data: {} as T };
  }

  try {
    const data = JSON.parse(text) as T;
    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error?: string }).error || "")
          : "";
      return { ok: false, message: msg || `Request failed (${res.status})` };
    }
    return { ok: true, data };
  } catch {
    const hint = trimmed.slice(0, 60).replace(/\s+/g, " ");
    return {
      ok: false,
      message: res.ok
        ? `Unexpected response from server`
        : `Server returned non-JSON (${res.status}): ${hint}`,
    };
  }
}
