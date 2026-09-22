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
    <div className="p-5 max-w-md flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{client.name} — thresholds</h2>
        <p className="text-sm text-text-dim mt-1">
          These decide the green / amber / red flag on every ad and drive the scale/close recommendations.
        </p>
      </div>

      <Field label="Currency">
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Good CPL (green) — at or below">
        <div className="flex items-center gap-2">
          <span className="text-text-faint text-sm">{currency}</span>
          <input
            type="number"
            value={goodMax}
            onChange={(e) => setGoodMax(e.target.value)}
            className="w-full rounded-md border border-good/30 bg-good-bg px-3 py-2 text-sm text-good font-medium"
          />
        </div>
      </Field>

      <Field label="Watch ceiling (amber) — at or below; above this is kill (red)">
        <div className="flex items-center gap-2">
          <span className="text-text-faint text-sm">{currency}</span>
          <input
            type="number"
            value={watchMax}
            onChange={(e) => setWatchMax(e.target.value)}
            className="w-full rounded-md border border-kill/30 bg-kill-bg px-3 py-2 text-sm text-kill font-medium"
          />
        </div>
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save thresholds'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-faint uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}
