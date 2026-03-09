import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/New_York'
const BOUNDARY_HOUR = 4

/**
 * Convert a YYYY-MM-DD calendar date to UTC start/end bounds for the
 * 4am–4am Eastern "day" window.
 */
export function getDayBounds(dateStr: string): { startUtc: string; endUtc: string } {
  const [year, month, day] = dateStr.split('-').map(Number)

  // 4am Eastern on dateStr
  const startZoned = new Date(year, month - 1, day, BOUNDARY_HOUR, 0, 0, 0)
  const startUtc = fromZonedTime(startZoned, TIMEZONE)

  // 4am Eastern on dateStr + 1
  const endZoned = new Date(year, month - 1, day + 1, BOUNDARY_HOUR, 0, 0, 0)
  const endUtc = fromZonedTime(endZoned, TIMEZONE)

  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
  }
}

/**
 * Return today's date string (YYYY-MM-DD) in Eastern time, adjusted for the
 * 4am boundary — before 4am Eastern counts as the previous calendar day.
 */
export function getTodayDateString(): string {
  const nowEastern = toZonedTime(new Date(), TIMEZONE)

  if (nowEastern.getHours() < BOUNDARY_HOUR) {
    nowEastern.setDate(nowEastern.getDate() - 1)
  }

  const y = nowEastern.getFullYear()
  const m = String(nowEastern.getMonth() + 1).padStart(2, '0')
  const d = String(nowEastern.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
