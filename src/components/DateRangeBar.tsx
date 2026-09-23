import { useState } from 'react'
import clsx from 'clsx'

export interface DateRange {
  start: string | null // YYYY-MM-DD, inclusive
  end: string | null // YYYY-MM-DD, inclusive
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const PRESETS: { label: string; range: DateRange }[] = [
  { label: 'All time', range: { start: null, end: null } },
  { label: 'Last 7 days', range: { start: isoDaysAgo(6), end: null } },
  { label: 'Last 14 days', range: { start: isoDaysAgo(13), end: null } },
  { label: 'Last 30 days', range: { start: isoDaysAgo(29), end: null } },
]

/** Top-of-dashboard date filter: preset ranges or a custom start/end picker. Drives every total, chart and recommendation below it. */
export function DateRangeBar({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [customOpen, setCustomOpen] = useState(false)

  const activePresetLabel = PRESETS.find((p) => p.range.start === range.start && p.range.end === range.end)?.label
  const isCustom = !activePresetLabel

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border shrink-0 bg-surface-2/30">
      <span className="text-[11px] text-text-faint uppercase tracking-wider font-semibold mr-1">Date range</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            onChange(p.range)
            setCustomOpen(false)
          }}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border',
            activePresetLabel === p.label
              ? 'bg-accent-bg border-accent/30 text-accent-hover'
              : 'border-transparent text-text-dim hover:bg-surface-2 hover:text-text',
          )}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setCustomOpen((v) => !v)}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border',
          isCustom ? 'bg-accent-bg border-accent/30 text-accent-hover' : 'border-transparent text-text-dim hover:bg-surface-2 hover:text-text',
        )}
      >
        {isCustom ? `${range.start ?? '…'} → ${range.end ?? 'today'}` : 'Custom…'}
      </button>

      {customOpen && (
        <div className="flex items-center gap-2 pl-1">
          <input
            type="date"
            value={range.start ?? ''}
            onChange={(e) => onChange({ ...range, start: e.target.value || null })}
            className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors"
          />
          <span className="text-text-faint text-xs">to</span>
          <input
            type="date"
            value={range.end ?? ''}
            onChange={(e) => onChange({ ...range, end: e.target.value || null })}
            className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors"
          />
          {(range.start || range.end) && (
            <button
              onClick={() => onChange({ start: null, end: null })}
              className="text-xs text-text-faint hover:text-text underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
