import { useEffect, useState } from 'react'
import type { AdMetrics, Client } from '../lib/types'
import { ActionBadge, CplBadge } from './StatusBadge'
import { CplSparkline } from './Sparkline'
import { closeAd, reopenAd, updateAdFields } from '../lib/store'
import { NotesField } from './NotesField'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdDetailPanel({
  metrics,
  client,
  onChanged,
}: {
  metrics: AdMetrics | null
  client: Client
  onChanged: () => void
}) {
  const [closing, setClosing] = useState(false)
  const [closeDate, setCloseDate] = useState(todayIso())
  const [closeReason, setCloseReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scaleFlash, setScaleFlash] = useState(false)

  // Reset the close form whenever the selected ad changes.
  useEffect(() => {
    setClosing(false)
    setCloseDate(todayIso())
    setCloseReason('')
    setError(null)
    setScaleFlash(false)
  }, [metrics?.ad.id])

  if (!metrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-faint text-sm p-8 text-center gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="opacity-40">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Select an ad to see its details
      </div>
    )
  }

  const { ad, daysActive, totalSpend, totalResults, cpl, ctr, lpConvRate, avgFrequency, flag, recommendation, entries } = metrics

  async function handleScale() {
    setSaving(true)
    setError(null)
    try {
      const stamp = todayIso()
      const marker = `[Scaled ${stamp}]`
      const prevNotes = ad.notes ?? ''
      const notes = prevNotes ? `${prevNotes}\n${marker}` : marker
      await updateAdFields(ad.id, { notes })
      setScaleFlash(true)
      setTimeout(() => setScaleFlash(false), 1800)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmClose() {
    if (!closeReason.trim()) {
      setError('A reason is required to close this ad.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await closeAd(ad.id, closeDate, closeReason.trim())
      setClosing(false)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not close this ad — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReopen() {
    setSaving(true)
    setError(null)
    try {
      await reopenAd(ad.id)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reopen this ad — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 flex flex-col gap-5 h-full overflow-y-auto">
      <div>
        <div className="text-[11px] text-text-faint uppercase tracking-wider font-semibold mb-1.5">Selected Ad</div>
        <div className="text-base font-semibold leading-snug">{ad.name}</div>
        <div className="mt-2">
          <ActionBadge action={recommendation.action} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-2/60 p-3.5 text-sm leading-relaxed text-text-dim">
        <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1.5">Auto summary</div>
        {recommendation.reason}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Active since" value={`${ad.first_active_date}`} sub={`${daysActive} day${daysActive === 1 ? '' : 's'}`} />
        <Stat label="Total spend" value={`${client.currency} ${totalSpend.toFixed(2)}`} />
        <Stat label="Leads" value={String(totalResults)} />
        <Stat label="CPL" custom={<CplBadge cpl={cpl} flag={flag} currency={client.currency} />} />
        <Stat label="CTR" value={ctr === null ? '—' : `${ctr.toFixed(2)}%`} />
        <Stat label="LP Conv Rate" value={lpConvRate === null ? '—' : `${lpConvRate.toFixed(2)}%`} />
        <Stat label="Frequency" value={avgFrequency === null ? '—' : avgFrequency.toFixed(2)} />
        <Stat label="Status" value={ad.status} />
      </div>

      {/* Manual actions */}
      <div>
        {ad.status === 'active' ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleScale}
                disabled={saving}
                className="flex-1 rounded-lg border border-good/30 bg-good-bg hover:bg-good/20 transition-colors px-3.5 py-2 text-sm font-semibold text-good disabled:opacity-50"
              >
                Scale
              </button>
              <button
                onClick={() => {
                  setClosing((v) => !v)
                  setError(null)
                }}
                disabled={saving}
                className="flex-1 rounded-lg border border-kill/30 bg-kill-bg hover:bg-kill/20 transition-colors px-3.5 py-2 text-sm font-semibold text-kill disabled:opacity-50"
              >
                {closing ? 'Cancel' : 'Stop / Close'}
              </button>
            </div>
            {scaleFlash && <div className="text-[11px] text-good px-1">Marked as scaled — noted below.</div>}

            {closing && (
              <div className="rounded-xl border border-kill/30 bg-kill-bg/40 p-3.5 flex flex-col gap-2.5">
                <div>
                  <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1">Closed on</div>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1">Reason (required)</div>
                  <textarea
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    placeholder="Why are you closing this ad?"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm resize-y focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors placeholder:text-text-faint"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmClose}
                    disabled={saving}
                    className="rounded-lg bg-kill hover:bg-kill/85 transition-colors px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Closing…' : 'Confirm close'}
                  </button>
                  <button
                    onClick={() => {
                      setClosing(false)
                      setError(null)
                    }}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-text-dim hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-2/60 p-3.5 flex flex-col gap-2">
            <div className="text-sm">
              <span className="font-semibold text-kill">Closed</span>
              {ad.closed_date && <span className="text-text-dim"> on {ad.closed_date}</span>}
            </div>
            {ad.close_reason && <div className="text-xs text-text-dim leading-relaxed">Reason: {ad.close_reason}</div>}
            <button
              onClick={handleReopen}
              disabled={saving}
              className="self-start text-xs text-accent hover:text-accent-hover underline underline-offset-2 disabled:opacity-50"
            >
              {saving ? 'Reopening…' : 'Reopen this ad'}
            </button>
          </div>
        )}
        {error && <div className="text-[11px] text-kill mt-2 px-1">{error}</div>}
      </div>

      <div>
        <div className="text-[11px] text-text-faint uppercase tracking-wider font-semibold mb-2">CPL Trend</div>
        <div className="rounded-xl border border-border bg-surface-2/60 p-2">
          <CplSparkline entries={entries} />
        </div>
      </div>

      <div>
        <div className="text-[11px] text-text-faint uppercase tracking-wider font-semibold mb-2">Notes</div>
        <NotesField
          value={ad.notes}
          placeholder="What's this creative about, what's being tested…"
          onSave={async (notes) => {
            await updateAdFields(ad.id, { notes })
            onChanged()
          }}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, sub, custom }: { label: string; value?: string; sub?: string; custom?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
      <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1">{label}</div>
      {custom ?? <div className="text-sm font-semibold tabular-nums">{value}</div>}
      {sub && <div className="text-[11px] text-text-faint mt-0.5">{sub}</div>}
    </div>
  )
}
