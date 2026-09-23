import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { Ad, AdMetrics, AdSet, Campaign, Client, DailyEntry } from '../lib/types'
import { listAllAdsForClient, listAllEntriesForAds, updateAdSetNotes } from '../lib/store'
import { buildAdMetrics, filterEntriesByRange, mergeEntriesByDate } from '../lib/metrics'
import { CplBadge, ActionBadge } from '../components/StatusBadge'
import { AdDetailPanel } from '../components/AdDetailPanel'
import { RecommendationsPanel } from '../components/RecommendationsPanel'
import { CplSparkline } from '../components/Sparkline'
import { NotesField } from '../components/NotesField'
import { DateRangeBar, type DateRange } from '../components/DateRangeBar'

export function Dashboard({ client, refreshKey }: { client: Client; refreshKey: number }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [entriesByAd, setEntriesByAd] = useState<Record<string, DailyEntry[]>>({})
  const [loading, setLoading] = useState(true)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [expandedAdSetId, setExpandedAdSetId] = useState<string | null>(null)
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange>({ start: null, end: null })

  async function load() {
    setLoading(true)
    const { ads, adSets, campaigns } = await listAllAdsForClient(client.id)
    const entries = await listAllEntriesForAds(ads.map((a) => a.id))
    setCampaigns(campaigns)
    setAdSets(adSets)
    setAds(ads)
    setEntriesByAd(entries)
    if (!selectedCampaignId && campaigns.length > 0) setSelectedCampaignId(campaigns[0].id)
    setLoading(false)
  }

  useEffect(() => {
    load()
    setSelectedCampaignId(null)
    setExpandedAdSetId(null)
    setSelectedAdId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, refreshKey])

  // "As of" for day-count purposes: the end of the selected range, or real
  // today when no range/end is chosen. A closed ad's own closed_date always
  // wins over this (handled inside daysActive/recommend).
  const asOf = useMemo(() => (range.end ? new Date(`${range.end}T12:00:00`) : new Date()), [range.end])

  const filteredEntriesByAd = useMemo(() => {
    if (!range.start && !range.end) return entriesByAd
    const result: Record<string, DailyEntry[]> = {}
    for (const [adId, entries] of Object.entries(entriesByAd)) {
      result[adId] = filterEntriesByRange(entries, range.start, range.end)
    }
    return result
  }, [entriesByAd, range])

  const allAdMetrics: AdMetrics[] = useMemo(() => {
    const spendByAd = ads.map((ad) => {
      const entries = filteredEntriesByAd[ad.id] ?? []
      const spend = entries.reduce((s, e) => s + e.spend, 0)
      const results = entries.reduce((s, e) => s + e.results, 0)
      return { ad, cpl: results > 0 ? spend / results : null }
    })
    const validCpls = spendByAd.map((s) => s.cpl).filter((c): c is number => c !== null)
    const bestCpl = validCpls.length > 0 ? Math.min(...validCpls) : null

    return ads.map((ad) =>
      buildAdMetrics({ ad, entries: filteredEntriesByAd[ad.id] ?? [], client, bestCplInAccount: bestCpl, asOf }),
    )
  }, [ads, filteredEntriesByAd, client, asOf])

  const metricsByAdId = useMemo(() => new Map(allAdMetrics.map((m) => [m.ad.id, m])), [allAdMetrics])

  const visibleAdSets = adSets.filter((s) => s.campaign_id === selectedCampaignId)
  const selectedAdMetrics = selectedAdId ? metricsByAdId.get(selectedAdId) ?? null : null

  const accountTotals = useMemo(() => {
    const active = allAdMetrics.filter((m) => m.ad.status === 'active')
    const spend = active.reduce((s, m) => s + m.totalSpend, 0)
    const results = active.reduce((s, m) => s + m.totalResults, 0)
    const cpl = results > 0 ? spend / results : null
    const closeCount = active.filter((m) => m.recommendation.action === 'close').length
    const scaleCount = active.filter((m) => m.recommendation.action === 'scale').length
    return { spend, results, cpl, activeCount: active.length, closeCount, scaleCount }
  }, [allAdMetrics])

  if (loading) {
    return (
      <div className="p-8 text-text-faint text-sm flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-text-faint border-t-transparent animate-spin" />
        Loading…
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-8 text-text-faint text-sm">
        No data yet for {client.name}. Go to <span className="text-text font-medium">Import Data</span> to bring in a CSV, or{' '}
        <span className="text-text font-medium">Manual Entry</span> once you've imported at least one ad set structure.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Custom calendar / date range filter */}
      <DateRangeBar range={range} onChange={setRange} />

      {/* Account summary strip */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0 overflow-x-auto">
        <SummaryTile label="Active ads" value={String(accountTotals.activeCount)} />
        <SummaryTile label="Total spend" value={`${client.currency} ${accountTotals.spend.toFixed(0)}`} />
        <SummaryTile label="Leads" value={String(accountTotals.results)} />
        <SummaryTile label="Blended CPL" value={accountTotals.cpl === null ? '—' : `${client.currency} ${accountTotals.cpl.toFixed(2)}`} />
        <SummaryTile label="To close" value={String(accountTotals.closeCount)} tone={accountTotals.closeCount > 0 ? 'kill' : undefined} />
        <SummaryTile label="To scale" value={String(accountTotals.scaleCount)} tone={accountTotals.scaleCount > 0 ? 'good' : undefined} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Campaign level */}
        <div className="w-60 border-r border-border shrink-0 overflow-y-auto py-2">
          <div className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-text-faint">Campaigns</div>
          <div className="flex flex-col gap-1 px-2">
            {campaigns.map((c) => {
              const camAds = allAdMetrics.filter((m) => adSets.find((s) => s.id === m.ad.ad_set_id)?.campaign_id === c.id)
              const spend = camAds.reduce((s, m) => s + m.totalSpend, 0)
              const active = selectedCampaignId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCampaignId(c.id)
                    setExpandedAdSetId(null)
                  }}
                  className={clsx(
                    'w-full text-left rounded-lg px-3 py-2.5 transition-colors',
                    active ? 'bg-accent-bg border border-accent/30' : 'hover:bg-surface-2 border border-transparent',
                  )}
                >
                  <div className={clsx('text-sm font-semibold truncate', active && 'text-accent-hover')}>{c.name}</div>
                  <div className="text-xs text-text-faint mt-0.5 tabular-nums">
                    {client.currency} {spend.toFixed(0)} · {camAds.length} ads
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ad set + ad level */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {visibleAdSets.map((set) => {
            const setAdMetrics = allAdMetrics.filter((m) => m.ad.ad_set_id === set.id)
            const spend = setAdMetrics.reduce((s, m) => s + m.totalSpend, 0)
            const results = setAdMetrics.reduce((s, m) => s + m.totalResults, 0)
            const avgCpl = results > 0 ? spend / results : null
            const worstFlag = setAdMetrics.some((m) => m.flag === 'kill')
              ? 'kill'
              : setAdMetrics.some((m) => m.flag === 'watch')
                ? 'watch'
                : 'good'
            const expanded = expandedAdSetId === set.id
            const activeSetMetrics = setAdMetrics.filter((m) => m.ad.status === 'active')
            const standouts = activeSetMetrics.filter((m) => m.recommendation.action !== 'keep' && m.recommendation.action !== 'monitor')
            const aggregateEntries = mergeEntriesByDate(setAdMetrics.flatMap((m) => m.entries))

            return (
              <div key={set.id} className="border-b border-border">
                <button
                  onClick={() => setExpandedAdSetId(expanded ? null : set.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/60 transition-colors text-left"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={clsx('shrink-0 text-text-faint transition-transform', expanded && 'rotate-90')}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className={clsx(
                      'h-2 w-2 rounded-full shrink-0',
                      worstFlag === 'kill' ? 'bg-kill shadow-[0_0_6px] shadow-kill' : worstFlag === 'watch' ? 'bg-watch shadow-[0_0_6px] shadow-watch' : 'bg-good shadow-[0_0_6px] shadow-good',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{set.name}</div>
                    <div className="text-xs text-text-faint mt-0.5">
                      {set.daily_budget ? `${client.currency} ${set.daily_budget}/day · ` : ''}
                      {setAdMetrics.length} ad{setAdMetrics.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <CplBadge cpl={avgCpl} flag={worstFlag} currency={client.currency} />
                </button>

                {expanded && (
                  <>
                    {/* Ad set summary: notes, standout recommendations, aggregate trend */}
                    <div className="px-4 pb-4 pt-1 bg-surface-2/20 border-t border-border/40">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 pt-3">
                        <div className="flex flex-col gap-3 min-w-0">
                          <div>
                            <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1.5">About this ad set</div>
                            <NotesField
                              value={set.notes}
                              placeholder="What's this ad set testing? (audience, hook angle, offer…)"
                              onSave={async (notes) => {
                                await updateAdSetNotes(set.id, notes)
                                load()
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1.5">Ad set summary</div>
                            {standouts.length === 0 ? (
                              <div className="text-xs text-text-faint px-1">No standout ads yet — everything's within range, or it's too early to call.</div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {standouts.map((m) => (
                                  <button
                                    key={m.ad.id}
                                    onClick={() => setSelectedAdId(m.ad.id)}
                                    className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-2 transition-colors"
                                  >
                                    <ActionBadge action={m.recommendation.action} />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold truncate">{m.ad.name}</div>
                                      <div className="text-[11px] text-text-faint leading-snug">{m.recommendation.reason}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold mb-1.5">Ad set CPL trend</div>
                          <div className="rounded-xl border border-border bg-surface-2/60 p-2">
                            <CplSparkline entries={aggregateEntries} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="text-text-faint text-[11px] uppercase tracking-wider bg-surface-2/40 sticky top-0">
                        <tr>
                          <th className="text-left pl-11 pr-2 py-2 font-semibold">Ad</th>
                          <th className="text-right px-2 py-2 font-semibold">Days</th>
                          <th className="text-right px-2 py-2 font-semibold">Spend</th>
                          <th className="text-right px-2 py-2 font-semibold">Leads</th>
                          <th className="text-right px-2 py-2 font-semibold">CPL</th>
                          <th className="text-right px-2 pr-4 py-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {setAdMetrics.map((m, i) => (
                          <tr
                            key={m.ad.id}
                            onClick={() => setSelectedAdId(m.ad.id)}
                            className={clsx(
                              'cursor-pointer border-t border-border/60 transition-colors hover:bg-surface-2/70',
                              i % 2 === 1 && 'bg-surface-2/20',
                              selectedAdId === m.ad.id && 'bg-accent-bg hover:bg-accent-bg',
                            )}
                          >
                            <td className="pl-11 pr-2 py-2 truncate max-w-[260px]">
                              {m.ad.name}
                              {m.ad.status !== 'active' && (
                                <span className="ml-2 text-[10px] text-text-faint uppercase font-semibold">{m.ad.status}</span>
                              )}
                            </td>
                            <td className="text-right px-2 py-2 tabular-nums text-text-dim">{m.daysActive}</td>
                            <td className="text-right px-2 py-2 tabular-nums text-text-dim">{m.totalSpend.toFixed(2)}</td>
                            <td className="text-right px-2 py-2 tabular-nums text-text-dim">{m.totalResults}</td>
                            <td className="text-right px-2 py-2">
                              <CplBadge cpl={m.cpl} flag={m.flag} currency={client.currency} />
                            </td>
                            <td className="text-right px-2 pr-4 py-2">
                              <ActionBadge action={m.recommendation.action} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Ad detail panel */}
        <div className="w-80 border-l border-border shrink-0 overflow-y-auto bg-surface/40">
          <AdDetailPanel metrics={selectedAdMetrics} client={client} onChanged={load} />
        </div>
      </div>

      {/* Recommendations */}
      <div className="border-t border-border shrink-0 max-h-56 overflow-y-auto bg-surface/40">
        <div className="px-4 pt-2.5 text-[11px] uppercase tracking-wider font-semibold text-text-faint">Recommendations</div>
        <RecommendationsPanel allAds={allAdMetrics} client={client} onSelectAd={setSelectedAdId} />
      </div>
    </div>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'kill' }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-2 shrink-0 min-w-[104px]">
      <div className="text-[10px] text-text-faint uppercase tracking-wider font-semibold">{label}</div>
      <div
        className={clsx(
          'text-base font-bold tabular-nums mt-0.5',
          tone === 'good' ? 'text-good' : tone === 'kill' ? 'text-kill' : 'text-text',
        )}
      >
        {value}
      </div>
    </div>
  )
}
