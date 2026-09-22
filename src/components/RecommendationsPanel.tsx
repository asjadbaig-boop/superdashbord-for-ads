import type { AdMetrics, Client } from '../lib/types'
import { ActionBadge } from './StatusBadge'

export function RecommendationsPanel({
  allAds,
  client,
  onSelectAd,
}: {
  allAds: AdMetrics[]
  client: Client
  onSelectAd: (adId: string) => void
}) {
  const active = allAds.filter((m) => m.ad.status === 'active')
  const close = active.filter((m) => m.recommendation.action === 'close')
  const review = active.filter((m) => m.recommendation.action === 'review')
  const scale = active.filter((m) => m.recommendation.action === 'scale')

  if (close.length === 0 && review.length === 0 && scale.length === 0) {
    return (
      <div className="text-sm text-text-faint px-4 py-3">
        No standout recommendations yet — need a few more days of data.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {close.map((m) => (
        <Row key={m.ad.id} m={m} client={client} onSelectAd={onSelectAd} />
      ))}
      {review.map((m) => (
        <Row key={m.ad.id} m={m} client={client} onSelectAd={onSelectAd} />
      ))}
      {scale.map((m) => (
        <Row key={m.ad.id} m={m} client={client} onSelectAd={onSelectAd} />
      ))}
    </div>
  )
}

function Row({ m, client, onSelectAd }: { m: AdMetrics; client: Client; onSelectAd: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelectAd(m.ad.id)}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface-2 transition-colors"
    >
      <ActionBadge action={m.recommendation.action} />
      <span className="text-sm font-medium truncate flex-1">{m.ad.name}</span>
      <span className="text-xs text-text-faint tabular-nums shrink-0">
        {m.cpl === null ? '—' : `${client.currency} ${m.cpl.toFixed(2)}`}
      </span>
      <span className="text-xs text-text-dim truncate max-w-[320px] hidden lg:block">{m.recommendation.reason}</span>
    </button>
  )
}
