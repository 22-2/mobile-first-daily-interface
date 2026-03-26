
// Workers are detached from UI, so we avoid window.moment.
// We use native Date with "T" as a separator to force local-time parsing for consistent results.
// (Mental model: Date("YYYY-MM-DD") is UTC, but Date("YYYY-MM-DDTHH:mm:ss") is local).
export function toLocalDateOnly(noteDate: string): Date {
  return new Date(noteDate.includes("T") ? noteDate : `${noteDate}T00:00:00`);
}
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
/** time が "YYYY-MM-DD HH:mm:ss" 形式ならその日付を、それ以外は noteDay の日付を prefix として使う */
export function parseTimeWithDate(time: string, dateStr: string): Date {
  return time.includes("-")
    ? new Date(time.replace(" ", "T")) // YYYY-MM-DD HH:mm:ss
    : new Date(`${dateStr}T${time}`); // YYYY-MM-DDTHH:mm:ss
}
