// Only confirmed nonempty TAGO timetable results qualify as a displayed route.
// Missing, partial and failed responses must not be mistaken for no service.
export function classifyRailAvailability(payload) {
 if(!payload || payload.ok!==true || !Array.isArray(payload.trains))return 'unavailable';
 if(payload.trains.length>0)return 'confirmed';
 if(payload.partial)return 'unavailable';
 return 'empty';
}
