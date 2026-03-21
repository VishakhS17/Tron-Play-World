export function toOrderNumber(id: string) {
  const compact = id.replace(/-/g, "").toUpperCase();
  return `ORD-${compact.slice(0, 10)}`;
}
