// Hide ambiguous API-only numbered sections from the public terminal picker.
// Keep all server-supplied terminal records intact for data integrity.
export function isDisplayableTerminal(terminal) {
  const name = String(terminal?.name ?? '').normalize('NFKC').trim();
  return name.length > 0 && !/^\d+\s*구간$/u.test(name);
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