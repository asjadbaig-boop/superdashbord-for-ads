import { useState } from 'react'
import type { Ad } from '../lib/types'
import { upsertEntry } from '../lib/store'

interface Row {
  adId: string
  spend: string
  results: string
  clicks: string
  impressions: string
  lpv: string
  frequency: string
}

function blankRow(adId: string): Row {
  return { adId, spend: '', results: '', clicks: '', impressions: '', lpv: '', frequency: '' }
}

export function ManualEntryGrid({ ads, onSaved }: { ads: Ad[]; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<Row[]>(ads.filter((a) => a.status === 'active').map((a) => blankRow(a.id)))
  const [saving, setSaving] = useState(false)

  function update(adId: string, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => (r.adId === adId ? { ...r, [field]: value } : r)))
  }

  async function save() {
    setSaving(true)
    try {
      for (const r of rows) {
        if (!r.spend && !r.results && !r.clicks && !r.impressions && !r.lpv) continue // skip untouched rows
        await upsertEntry({
          ad_id: r.adId,
          date,
          spend: Number(r.spend) || 0,
          results: Number(r.results) || 0,
          clicks: Number(r.clicks) || 0,
          impressions: Number(r.impressions) || 0,
          landing_page_views: Number(r.lpv) || 0,
          frequency: r.frequency ? Number(r.frequency) : null,
        })
      }
      setRows(ads.filter((a) => a.status === 'active').map((a) => blankRow(a.id)))
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const activeAds = ads.filter((a) => a.status === 'active')

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight">Manual daily entry</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {activeAds.length === 0 ? (
        <div className="text-sm text-text-faint">No active ads in this ad set yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-faint text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3.5 py-2.5 font-semibold">Ad</th>
                <th className="text-right px-3 py-2.5 font-semibold">Spend</th>
                <th className="text-right px-3 py-2.5 font-semibold">Results</th>
                <th className="text-right px-3 py-2.5 font-semibold">Clicks</th>
                <th className="text-right px-3 py-2.5 font-semibold">Impressions</th>
                <th className="text-right px-3 py-2.5 font-semibold">LPV</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Freq</th>
              </tr>
            </thead>
            <tbody>
              {activeAds.map((ad, i) => {
                const row = rows.find((r) => r.adId === ad.id)!
                return (
                  <tr key={ad.id} className={`border-t border-border ${i % 2 === 1 ? 'bg-surface-2/30' : ''}`}>
                    <td className="px-3.5 py-2 truncate max-w-[220px] font-medium">{ad.name}</td>
                    {(['spend', 'results', 'clicks', 'impressions', 'lpv', 'frequency'] as const).map((field) => (
                      <td key={field} className="px-2 py-2">
                        <input
                          type="number"
                          value={row[field]}
                          onChange={(e) => update(ad.id, field, e.target.value)}
                          className="w-full text-right rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors"
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || activeAds.length === 0}
        className="self-start rounded-lg bg-accent hover:bg-accent-hover transition-colors px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg shadow-accent/20"
      >
        {saving ? 'Saving…' : `Save entries for ${date}`}
      </button>
    </div>
  )
}
