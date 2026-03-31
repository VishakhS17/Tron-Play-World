export function isActiveInWindow(
  isActive: boolean,
  activeFrom: Date | null | undefined,
  activeUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!isActive) return false;
  if (activeFrom && activeFrom > now) return false;
  if (activeUntil && activeUntil < now) return false;
  return true;
}
