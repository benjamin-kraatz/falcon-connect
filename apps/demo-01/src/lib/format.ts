export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function tokenPreview(token: string) {
  return `${token.slice(0, 28)}...${token.slice(-18)}`;
}
