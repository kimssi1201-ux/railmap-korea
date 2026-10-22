// Hide API-only administrative labels in the public picker.
// IMPORTANT: keep distinct real terminal locations (e.g. 광주(유·스퀘어), 광주비아, 경기광주).
// Raw TAGO terminal records and their IDs remain unchanged on the server.
export function isDisplayableTerminal(terminal) {
  const name = String(terminal?.name ?? '').normalize('NFKC').trim();
  return name.length > 0
    && !/^\d+\s*구간$/u.test(name)
    // TAGO sometimes includes extra fare/fee-only aliases, e.g. 광주(500)_수수료.
    && !/(?:[_\s-]*수수료)\s*$/u.test(name);
}
export function visibleTerminals(terminals) {
  return Array.isArray(terminals) ? terminals.filter(isDisplayableTerminal) : [];
}


// Group duplicate display names without merging distinct API terminal IDs.
export function groupTerminalNames(terminals) {
  const grouped=new Map();
  for (const terminal of visibleTerminals(terminals)) {
    const name=String(terminal.name).normalize('NFKC').trim();
    if(!grouped.has(name))grouped.set(name,{name,terminals:[]});
    grouped.get(name).terminals.push(terminal);
  }
  return [...grouped.values()];
}

// An input alone cannot choose between several official IDs with the same name.
export function findUniqueTerminal(terminals, name) {
  const clean=s=>String(s??'').normalize('NFKC').replace(/[\s·()]/g,'').replace(/터미널$|정류장$/,'').toLowerCase();
  const matches=visibleTerminals(terminals).filter(t=>clean(t.name)===clean(name));
  return matches.length===1?matches[0]:null;
}


// Searchers should choose a place, not an opaque API code. The server can
// query each distinct official ID for the chosen display name.
export function terminalChoice(group) {
  if (!group?.name || !Array.isArray(group.terminals) || !group.terminals.length) return null;
  const ids=[...new Set(group.terminals.map(terminal=>String(terminal.id||'').trim()).filter(Boolean))];
  return ids.length ? {name:group.name,ids} : null;
}

export function findTerminalChoice(terminals, name) {
  const clean=s=>String(s??'').normalize('NFKC').replace(/[\s·()]/g,'').replace(/터미널$|정류장$/,'').toLowerCase();
  const hits=groupTerminalNames(terminals).filter(group=>clean(group.name)===clean(name));
  return hits.length===1?terminalChoice(hits[0]):null;
}