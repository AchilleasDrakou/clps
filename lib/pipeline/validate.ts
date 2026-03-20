export function validateUrl(url: string): string {
  // Auto-prepend https:// if no protocol
  let raw = url;
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`URL must use http or https: ${url}`);
  }

  // Block private/internal IPs
  const hostname = parsed.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("192.168.") ||
    hostname === "169.254.169.254" ||
    hostname.endsWith(".local")
  ) {
    throw new Error(`URL points to a private/internal address: ${hostname}`);
  }

  return parsed.href;
}
