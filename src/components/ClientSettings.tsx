import { useState } from 'react'
import type { Client } from '../lib/types'
import { updateClientThresholds } from '../lib/store'

export function ClientSettings({ client, onSaved }: { client: Client; onSaved: () => void }) {
  const [goodMax, setGoodMax] = useState(String(client.cpl_good_max))
  const [watchMax, setWatchMax] = useState(String(client.cpl_watch_max))
  const [currency, setCurrency] = useState(client.currency)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateClientThresholds(client.id, {
        cpl_good_max: Number(goodMax) || client.cpl_good_max,
        cpl_watch_max: Number(watchMax) || client.cpl_watch_max,
        currency,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-md flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{client.name} — thresholds</h2>
        <p className="text-sm text-text-dim mt-1.5 leading-relaxed">
          These decide the green / amber / red flag on every ad and drive the scale/close recommendations.
        </p>
      </div>

      <Field label="Currency">
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </Field>

      <Field label="Good CPL (green) — at or below">
        <div className="flex items-center gap-2">
          <span className="text-text-faint text-sm font-medium">{currency}</span>
          <input
            type="number"
            value={goodMax}
            onChange={(e) => setGoodMax(e.target.value)}
            className="w-full rounded-lg border border-good/30 bg-good-bg px-3.5 py-2.5 text-sm text-good font-semibold focus:outline-none focus:border-good transition-colors"
          />
        </div>
      </Field>

      <Field label="Watch ceiling (amber) — at or below; above this is kill (red)">
        <div className="flex items-center gap-2">
          <span className="text-text-faint text-sm font-medium">{currency}</span>
          <input
            type="number"
            value={watchMax}
            onChange={(e) => setWatchMax(e.target.value)}
            className="w-full rounded-lg border border-kill/30 bg-kill-bg px-3.5 py-2.5 text-sm text-kill font-semibold focus:outline-none focus:border-kill transition-colors"
          />
        </div>
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className="self-start rounded-lg bg-accent hover:bg-accent-hover transition-colors px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg shadow-accent/20"
      >
        {saving ? 'Saving…' : 'Save thresholds'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] text-text-faint uppercase tracking-wider font-semibold">{label}</span>
      {children}
    </label>
  )
}
