import clsx from 'clsx'
import type { FlagLevel, RecommendationAction } from '../lib/types'

const FLAG_STYLES: Record<FlagLevel, string> = {
  good: 'bg-good-bg text-good border-good/30',
  watch: 'bg-watch-bg text-watch border-watch/30',
  kill: 'bg-kill-bg text-kill border-kill/30',
}

export function FlagDot({ flag }: { flag: FlagLevel }) {
  const color = flag === 'good' ? 'bg-good' : flag === 'watch' ? 'bg-watch' : 'bg-kill'
  return <span className={clsx('inline-block h-2.5 w-2.5 rounded-full shrink-0', color)} />
}

const ACTION_LABEL: Record<RecommendationAction, string> = {
  scale: 'Scale',
  close: 'Close',
  review: 'Review',
  monitor: 'Monitor',
  keep: 'Keep',
}

const ACTION_STYLE: Record<RecommendationAction, string> = {
  scale: 'bg-good-bg text-good border-good/30',
  close: 'bg-kill-bg text-kill border-kill/30',
  review: 'bg-watch-bg text-watch border-watch/30',
  monitor: 'bg-surface-2 text-text-dim border-border',
  keep: 'bg-surface-2 text-text-dim border-border',
}

export function ActionBadge({ action }: { action: RecommendationAction }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', ACTION_STYLE[action])}>
      {ACTION_LABEL[action]}
    </span>
  )
}

export function CplBadge({ cpl, flag, currency }: { cpl: number | null; flag: FlagLevel; currency: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold tabular-nums', FLAG_STYLES[flag])}>
      <FlagDot flag={flag} />
      {cpl === null ? '—' : `${currency} ${cpl.toFixed(2)}`}
    </span>
  )
}
