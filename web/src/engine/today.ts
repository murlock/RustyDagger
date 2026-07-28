// Port of DCourt/Tools/Tools.java's getToday()/setToday() (a global "what day
// is it" used to gate once-per-day hero advancement). No setter is needed
// here: the Java version cached the value in a static field per session,
// which TS doesn't need since there's no per-request server round trip.

export function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
