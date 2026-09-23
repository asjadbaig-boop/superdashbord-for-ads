import type { AdMetrics, Client } from '../lib/types'
import { ActionBadge, CplBadge } from './StatusBadge'
import { CplSparkline } from './Sparkline'
import { updateAdFields } from '../lib/store'
import { NotesField } from './NotesField'

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
