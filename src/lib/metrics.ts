import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Ad, AdMetrics, Client, DailyEntry, FlagLevel, Recommendation } from './types'

export function daysActive(ad: Ad, today = new Date()): number {
  const start = parseISO(ad.first_active_date)
  return Math.max(0, differenceInCalendarDays(today, start) + 1)
}

export function sum(entries: DailyEntry[], key: keyof DailyEntry): number {
  return entries.reduce((acc, e) => acc + (Number(e[key]) || 0), 0)
}

/** CPL trend from the last 5 entries with spend > 0, oldest to newest. */
export function cplTrend(entries: DailyEntry[]): 'down' | 'up' | 'flat' | 'unknown' {
  const withSpend = [...entries]
    .filter((e) => e.spend > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5)
  const cpls = withSpend
    .map((e) => (e.results > 0 ? e.spend / e.results : null))
    .filter((v): v is number => v !== null)
  if (cpls.length < 3) return 'unknown'
  const first = cpls[0]
  const last = cpls[cpls.length - 1]
  const change = (last - first) / first
  if (change <= -0.15) return 'down' // CPL falling = improving
  if (change >= 0.15) return 'up'
  return 'flat'
}

/**
 * Merges entries from multiple ads (an ad set's worth) into one entry per
 * calendar date — summing spend/results/clicks/impressions/LPV and
 * averaging frequency. Used to draw an ad-set-level CPL trend chart.
 */
export function mergeEntriesByDate(entries: DailyEntry[]): DailyEntry[] {
  const byDate = new Map<string, DailyEntry>()
  for (const e of entries) {
    const existing = byDate.get(e.date)
    if (!existing) {
      byDate.set(e.date, { ...e, id: e.date, ad_id: 'aggregate' })
    } else {
      existing.spend += e.spend
      existing.results += e.results
      existing.clicks += e.clicks
      existing.impressions += e.impressions
      existing.landing_page_views += e.landing_page_views
      existing.frequency = e.frequency != null ? (existing.frequency != null ? (existing.frequency + e.frequency) / 2 : e.frequency) : existing.frequency
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function flagForCpl(cpl: number | null, client: Client): FlagLevel {
  if (cpl === null) return 'kill' // zero results after spend is a red flag by default
  if (cpl <= client.cpl_good_max) return 'good'
  if (cpl <= client.cpl_watch_max) return 'watch'
  return 'kill'
}

/**
 * Core recommendation logic — mirrors the kill/scale/review rules from the
 * meta-ads-analyzer workflow: relative-to-best-performer kill threshold,
 * zero-result-after-spend kill, frequency fatigue, and CPL trend for scale.
 */
export function recommend(params: {
  ad: Ad
  entries: DailyEntry[]
  client: Client
  bestCplInAccount: number | null
}): Recommendation {
  const { ad, entries, client, bestCplInAccount } = params
  const spend = sum(entries, 'spend')
  const results = sum(entries, 'results')
  const cpl = results > 0 ? spend / results : null
  const avgFreq =
    entries.filter((e) => e.frequency != null).length > 0
      ? sum(entries, 'frequency') / entries.filter((e) => e.frequency != null).length
      : null
  const active = daysActive(ad)
  const trend = cplTrend(entries)

  if (ad.status !== 'active') {
    return { action: 'monitor', reason: `Ad is currently ${ad.status}.` }
  }

  if (spend === 0) {
    return { action: 'review', reason: 'No spend recorded yet — check delivery in Ads Manager.' }
  }

  // Zero results after spending 2x the client's "good" CPL target
  if (results === 0 && spend >= client.cpl_good_max * 2) {
    return {
      action: 'close',
      reason: `$${spend.toFixed(2)} spent with zero results — over 2x your target CPL with nothing to show.`,
    }
  }

  // Relative kill: 3x+ the best performer in the account
  if (cpl !== null && bestCplInAccount !== null && bestCplInAccount > 0) {
    if (cpl >= bestCplInAccount * 3) {
      return {
        action: 'close',
        reason: `CPL $${cpl.toFixed(2)} is ${(cpl / bestCplInAccount).toFixed(1)}x your best-performing ad ($${bestCplInAccount.toFixed(2)}).`,
      }
    }
  }

  // Absolute kill threshold from client settings
  if (cpl !== null && cpl > client.cpl_watch_max) {
    return {
      action: 'close',
      reason: `CPL $${cpl.toFixed(2)} is above your kill threshold ($${client.cpl_watch_max}).`,
    }
  }

  // Frequency fatigue
  if (avgFreq !== null && avgFreq > 2.5) {
    return {
      action: 'review',
      reason: `Frequency at ${avgFreq.toFixed(2)} — audience fatigue, needs a creative refresh.`,
    }
  }

  // Not enough data yet
  if (active < 3 || results < 2) {
    return { action: 'monitor', reason: `Only ${active} day(s) active / ${results} result(s) — not enough data to judge yet.` }
  }

  // Scale: good CPL, healthy frequency, flat-or-improving trend
  if (cpl !== null && cpl <= client.cpl_good_max && (avgFreq === null || avgFreq < 1.8) && trend !== 'up') {
    return {
      action: 'scale',
      reason: `CPL $${cpl.toFixed(2)} is within target and ${trend === 'down' ? 'improving' : 'holding steady'}.`,
    }
  }

  // Rising CPL trend on an otherwise watch-range ad
  if (trend === 'up') {
    return { action: 'review', reason: 'CPL has been rising over the last few entries — worth a creative check.' }
  }

  return { action: 'keep', reason: 'Performing within range — no action needed.' }
}

export function buildAdMetrics(params: {
  ad: Ad
  entries: DailyEntry[]
  client: Client
  bestCplInAccount: number | null
}): AdMetrics {
  const { ad, entries, client, bestCplInAccount } = params
  const totalSpend = sum(entries, 'spend')
  const totalResults = sum(entries, 'results')
  const totalClicks = sum(entries, 'clicks')
  const totalImpressions = sum(entries, 'impressions')
  const totalLpv = sum(entries, 'landing_page_views')
  const freqEntries = entries.filter((e) => e.frequency != null)

  const cpl = totalResults > 0 ? totalSpend / totalResults : null
  const ctr = totalImpressions > 0 ? (100 * totalClicks) / totalImpressions : null
  const lpConvRate = totalLpv > 0 ? (100 * totalResults) / totalLpv : null
  const avgFrequency = freqEntries.length > 0 ? sum(freqEntries, 'frequency') / freqEntries.length : null

  return {
    ad,
    entries,
    daysActive: daysActive(ad),
    totalSpend,
    totalResults,
    cpl,
    ctr,
    avgFrequency,
    lpConvRate,
    cplTrend: cplTrend(entries),
    flag: flagForCpl(cpl, client),
    recommendation: recommend({ ad, entries, client, bestCplInAccount }),
  }
}
