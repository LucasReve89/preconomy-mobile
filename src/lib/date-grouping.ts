/**
 * RN date-grouping helper — mirrors preconomy-frontend/lib/date-grouping.ts.
 *
 * Duplicate (not symlinked) because preconomy-mobile and preconomy-frontend are
 * separate repos with no shared path alias.
 *
 * Uses Intl.DateTimeFormat('es-AR') — supported in Hermes and JSC (RN ≥ 0.70).
 * Pure function — deterministic for a given referenceDate. Inject referenceDate
 * in tests to avoid relying on the real clock.
 */

// ─── Transaction shape required by this helper ───────────────────────────────

export interface GroupableTransaction {
  id: number | string
  date: string // 'YYYY-MM-DD' or ISO 8601
  [key: string]: unknown
}

export interface DateGroup<T extends GroupableTransaction = GroupableTransaction> {
  /** ISO date string YYYY-MM-DD — stable React key */
  key: string
  /** Human-readable relative label (Hoy / Ayer / Lun 21 / Lun 21 mar) */
  label: string
  /** Transactions in this group, sorted newest-first */
  items: T[]
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  // Handle 'YYYY-MM-DD' and ISO 8601 ('YYYY-MM-DDTHH:mm:ss')
  const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function toISODateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns the calendar-day difference (d1 - d2) in whole days, ignoring time.
 */
function diffInCalendarDays(d1: Date, d2: Date): number {
  const msPerDay = 86_400_000
  const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate())
  return Math.round((t1 - t2) / msPerDay)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Abbreviated weekday label using Intl — returns e.g. "lun", "mar".
 * Supported by Hermes/JSC in RN ≥ 0.70.
 */
function weekdayAbbr(d: Date): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(d)
    .replace('.', '') // some locales append a period
}

/**
 * Abbreviated month using Intl — returns e.g. "ene", "feb", "mar".
 */
function monthAbbr(d: Date): string {
  return new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d)
    .replace('.', '')
}

function buildLabel(d: Date, today: Date): string {
  const diff = diffInCalendarDays(today, d)

  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'

  const wd = capitalize(weekdayAbbr(d)) // e.g. "Lun"
  const day = d.getDate()               // e.g. 21

  if (diff > 1 && diff < 7) {
    // e.g. "Lun 21"
    return `${wd} ${day}`
  }

  const mo = monthAbbr(d) // e.g. "mar"

  if (d.getFullYear() === today.getFullYear()) {
    // e.g. "Lun 21 mar"
    return `${wd} ${day} ${mo}`
  }

  // e.g. "Lun 21 mar 25"
  const yr = String(d.getFullYear()).slice(2)
  return `${wd} ${day} ${mo} ${yr}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Groups an array of transactions by calendar day and returns date-labelled
 * groups sorted newest-first.
 *
 * Label rules:
 *   today         → "Hoy"
 *   yesterday     → "Ayer"
 *   2–6 days ago  → "Lun 21"
 *   same year     → "Lun 21 mar"
 *   different year→ "Lun 21 mar 25"
 *
 * Items inside each group are sorted by date descending.
 * Groups are ordered newest-first (descending by key).
 * Invalid or missing dates are silently skipped.
 */
export function groupTransactionsByRelativeDate<T extends GroupableTransaction>(
  transactions: T[],
  referenceDate: Date = new Date(),
): DateGroup<T>[] {
  if (!transactions.length) return []

  // Normalize "today" to midnight local time
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )

  // Bucket transactions by YYYY-MM-DD key
  const buckets = new Map<string, T[]>()

  for (const tx of transactions) {
    const d = parseDate(tx.date)
    if (!d) continue
    const key = toISODateKey(d)
    const bucket = buckets.get(key) ?? []
    bucket.push(tx)
    buckets.set(key, bucket)
  }

  const groups: DateGroup<T>[] = []

  for (const [key, items] of buckets) {
    const d = parseDate(key)
    if (!d) continue

    const label = buildLabel(d, today)

    // Sort items within group newest-first
    const sorted = [...items].sort((a, b) => {
      const da = parseDate(a.date)
      const db = parseDate(b.date)
      if (!da || !db) return 0
      return db.getTime() - da.getTime()
    })

    groups.push({ key, label, items: sorted })
  }

  // Sort groups newest-first
  groups.sort((a, b) => (a.key < b.key ? 1 : -1))

  return groups
}
