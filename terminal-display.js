// Hide ambiguous API-only numbered sections from the public terminal picker.
// Keep all server-supplied terminal records intact for data integrity.
export function isDisplayableTerminal(terminal) {
  const name = String(terminal?.name ?? '').normalize('NFKC').trim();
  return name.length > 0 && !/^\d+\s*구간$/u.test(name);
}
export function visibleTerminals(terminals) {
  return Array.isArray(terminals) ? terminals.filter(isDisplayableTerminal) : [];
}