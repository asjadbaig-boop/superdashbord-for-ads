import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { Ad, AdMetrics, AdSet, Campaign, Client, DailyEntry } from '../lib/types'
import { listAllAdsForClient, listAllEntriesForAds } from '../lib/store'
import { buildAdMetrics } from '../lib/metrics'
import { CplBadge } from '../components/StatusBadge'
import { AdDetailPanel } from '../components/AdDetailPanel'
import { RecommendationsPanel } from '../components/RecommendationsPanel'

export function Dashboard({ client, refreshKey }: { client: Client; refreshKey: number }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [entriesByAd, setEntriesByAd] = useState<Record<string, DailyEntry[]>>({})
  const [loading, setLoading] = useState(true)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [expandedAdSetId, setExpandedAdSetId] = useState<string | null>(null)
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)

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

  const allAdMetrics: AdMetrics[] = useMemo(() => {
    const spendByAd = ads.map((ad) => {
      const entries = entriesByAd[ad.id] ?? []
      const spend = entries.reduce((s, e) => s + e.spend, 0)
      const results = entries.reduce((s, e) => s + e.results, 0)
      return { ad, cpl: results > 0 ? spend / results : null }
    })
    const validCpls = spendByAd.map((s) => s.cpl).filter((c): c is number => c !== null)
    const bestCpl = validCpls.length > 0 ? Math.min(...validCpls) : null

    return ads.map((ad) =>
      buildAdMetrics({ ad, entries: entriesByAd[ad.id] ?? [], client, bestCplInAccount: bestCpl }),
    )
  }, [ads, entriesByAd, client])

  const metricsByAdId = useMemo(() => new Map(allAdMetrics.map((m) => [m.ad.id, m])), [allAdMetrics])

  const visibleAdSets = adSets.filter((s) => s.campaign_id === selectedCampaignId)
  const selectedAdMetrics = selectedAdId ? metricsByAdId.get(selectedAdId) ?? null : null

  if (loading) {
    return <div className="p-8 text-text-faint text-sm">Loading…</div>
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-8 text-text-faint text-sm">
        No data yet for {client.name}. Go to <span className="text-text">Import Data</span> to bring in a CSV, or{' '}
        <span className="text-text">Manual Entry</span> once you've imported at least one ad set structure.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border">
        <RecommendationsPanel allAds={allAdMetrics} client={client} onSelectAd={setSelectedAdId} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Campaign level */}
        <div className="w-56 border-r border-border shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-faint">Campaigns</div>
          {campaigns.map((c) => {
            const camAds = allAdMetrics.filter((m) => adSets.find((s) => s.id === m.ad.ad_set_id)?.campaign_id === c.id)
            const spend = camAds.reduce((s, m) => s + m.totalSpend, 0)
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCampaignId(c.id)
                  setExpandedAdSetId(null)
                }}
                className={clsx(
                  'w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-surface-2 transition-colors',
                  selectedCampaignId === c.id && 'bg-surface-2',
                )}
              >
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-text-faint mt-0.5 tabular-nums">
                  {client.currency} {spend.toFixed(2)} · {camAds.length} ad{camAds.length === 1 ? '' : 's'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Ad set / ad level */}
        <div className="w-80 border-r border-border shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-faint">Ad Sets</div>
          {visibleAdSets.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-faint">No ad sets in this campaign yet.</div>
          )}
          {visibleAdSets.map((s) => {
            const setAds = allAdMetrics.filter((m) => m.ad.ad_set_id === s.id)
            const expanded = expandedAdSetId === s.id
            return (
              <div key={s.id} className="border-b border-border/60">
                <button
                  onClick={() => setExpandedAdSetId(expanded ? null : s.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-2 transition-colors"
                >
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-text-faint mt-0.5">
                    {setAds.length} ad{setAds.length === 1 ? '' : 's'}
                  </div>
                </button>
                {expanded && (
                  <div className="pb-1">
                    {setAds.map((m) => (
                      <button
                        key={m.ad.id}
                        onClick={() => setSelectedAdId(m.ad.id)}
                        className={clsx(
                          'w-full flex items-center gap-2 text-left pl-5 pr-3 py-1.5 hover:bg-surface-2 transition-colors',
                          selectedAdId === m.ad.id && 'bg-surface-2',
                        )}
                      >
                        <span className="text-sm truncate flex-1">{m.ad.name}</span>
                        <CplBadge cpl={m.cpl} flag={m.flag} currency={client.currency} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <AdDetailPanel metrics={selectedAdMetrics} client={client} onChanged={load} />
        </div>
      </div>
    </div>
  )
}
