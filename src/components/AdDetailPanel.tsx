import type { AdMetrics, Client } from '../lib/types'
import { ActionBadge, CplBadge } from './StatusBadge'
import { CplSparkline } from './Sparkline'
import { setAdStatus } from '../lib/store'

export function AdDetailPanel({
  metrics,
  client,
  onChanged,
}: {
  metrics: AdMetrics | null
  client: Client
  onChanged: () => void
}) {
  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center text-text-faint text-sm p-8 text-center">
        Select an ad to see its details.
      </div>
    )
  }

  const { ad, daysActive, totalSpend, totalResults, cpl, ctr, lpConvRate, avgFrequency, flag, recommendation, entries } = metrics

  async function act(status: 'paused' | 'killed' | 'active') {
    await setAdStatus(ad.id, status)
    onChanged()
  }

  return (
    <div className="p-5 flex flex-col gap-5 h-full overflow-y-auto">
      <div>
        <div className="text-xs text-text-faint uppercase tracking-wide mb-1">Selected Ad</div>
        <div className="text-base font-semibold leading-snug">{ad.name}</div>
        <div className="mt-1">
          <ActionBadge action={recommendation.action} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed text-text-dim">
        {recommendation.reason}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Active since" value={`${ad.first_active_date}`} sub={`${daysActive} day${daysActive === 1 ? '' : 's'}`} />
        <Stat label="Total spend" value={`${client.currency} ${totalSpend.toFixed(2)}`} />
        <Stat label="Leads" value={String(totalResults)} />
        <Stat label="CPL" custom={<CplBadge cpl={cpl} flag={flag} currency={client.currency} />} />
        <Stat label="CTR" value={ctr === null ? '—' : `${ctr.toFixed(2)}%`} />
        <Stat label="LP Conv Rate" value={lpConvRate === null ? '—' : `${lpConvRate.toFixed(2)}%`} />
        <Stat label="Frequency" value={avgFrequency === null ? '—' : avgFrequency.toFixed(2)} />
        <Stat label="Status" value={ad.status} />
      </div>

      <div>
        <div className="text-xs text-text-faint uppercase tracking-wide mb-2">CPL Trend</div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <CplSparkline entries={entries} />
        </div>
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={() => act('active')}
          className="flex-1 rounded-md border border-good/30 bg-good-bg text-good text-sm font-medium py-2 hover:brightness-110"
        >
          Scale / Keep
        </button>
        <button
          onClick={() => act('paused')}
          className="flex-1 rounded-md border border-watch/30 bg-watch-bg text-watch text-sm font-medium py-2 hover:brightness-110"
        >
          Pause
        </button>
        <button
          onClick={() => act('killed')}
          className="flex-1 rounded-md border border-kill/30 bg-kill-bg text-kill text-sm font-medium py-2 hover:brightness-110"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, custom }: { label: string; value?: string; sub?: string; custom?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-text-faint uppercase tracking-wide mb-1">{label}</div>
      {custom ?? <div className="text-sm font-semibold tabular-nums">{value}</div>}
      {sub && <div className="text-[11px] text-text-faint mt-0.5">{sub}</div>}
    </div>
  )
}
