// A known empty schedule is not a useful timetable card.
export function hasConfirmedSchedule(rows){return Array.isArray(rows)&&rows.length>0}
// An unknown arrival ETA must never be shown as 0 minutes or "soon".
export function knownArrivalRows(rows){return (Array.isArray(rows)?rows:[]).filter(x=>Number.isFinite(x?.etaSeconds)&&x.etaSeconds>=0)}
// City bus providers can return an empty filtered page while additional pages remain.
export function showCitySearchResults(items,more){return (Array.isArray(items)&&items.length>0)||Boolean(more)}
