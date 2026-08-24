export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short label used in gallery date group headers: "Today", "Yesterday", "14 May". */
export function groupDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]*$/;

export function isAlphanumeric(value: string): boolean {
  return ALPHANUMERIC_REGEX.test(value);
}

export function contentTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":  return "image/png";
    case "gif":  return "image/gif";
    case "webp": return "image/webp";
    default:     return "image/jpeg";
  }
}
