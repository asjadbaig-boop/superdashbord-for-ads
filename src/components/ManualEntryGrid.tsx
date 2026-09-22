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
    <div className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Manual daily entry</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
        />
      </div>

      {activeAds.length === 0 ? (
        <div className="text-sm text-text-faint">No active ads in this ad set yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-faint text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Ad</th>
                <th className="text-right px-3 py-2 font-medium">Spend</th>
                <th className="text-right px-3 py-2 font-medium">Results</th>
                <th className="text-right px-3 py-2 font-medium">Clicks</th>
                <th className="text-right px-3 py-2 font-medium">Impressions</th>
                <th className="text-right px-3 py-2 font-medium">LPV</th>
                <th className="text-right px-3 py-2 font-medium">Freq</th>
              </tr>
            </thead>
            <tbody>
              {activeAds.map((ad) => {
                const row = rows.find((r) => r.adId === ad.id)!
                return (
                  <tr key={ad.id} className="border-t border-border">
                    <td className="px-3 py-1.5 truncate max-w-[220px]">{ad.name}</td>
                    {(['spend', 'results', 'clicks', 'impressions', 'lpv', 'frequency'] as const).map((field) => (
                      <td key={field} className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row[field]}
                          onChange={(e) => update(ad.id, field, e.target.value)}
                          className="w-full text-right rounded border border-border bg-surface px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-accent"
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
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : `Save entries for ${date}`}
      </button>
    </div>
  )
}
