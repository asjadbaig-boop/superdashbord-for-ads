import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { Ad, Client } from './lib/types'
import { listAllAdsForClient, listClients, createClient } from './lib/store'
import { supabaseConfigured } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { DataImport } from './components/DataImport'
import { ManualEntryGrid } from './components/ManualEntryGrid'
import { ClientSettings } from './components/ClientSettings'

type Tab = 'dashboard' | 'import' | 'manual' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'import', label: 'Import Data' },
  { id: 'manual', label: 'Manual Entry' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [ads, setAds] = useState<Ad[]>([])
  const [showNewClient, setShowNewClient] = useState(false)

  async function loadClients() {
    const list = await listClients()
    setClients(list)
    if (!selectedClientId && list.length > 0) setSelectedClientId(list[0].id)
  }

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const client = clients.find((c) => c.id === selectedClientId) ?? null

  useEffect(() => {
    if (!client) {
      setAds([])
      return
    }
    listAllAdsForClient(client.id).then(({ ads }) => {
      setAds(ads)
    })
  }, [client, refreshKey])

  function bumpRefresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-4 border-b border-border px-4 py-3 shrink-0">
        <div className="text-sm font-semibold tracking-tight">AdsByAsjad Tracker</div>

        <select
          value={selectedClientId ?? ''}
          onChange={(e) => {
            setSelectedClientId(e.target.value)
            setTab('dashboard')
          }}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
        >
          {clients.length === 0 && <option value="">No clients yet</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowNewClient(true)}
          className="rounded-md border border-border px-2 py-1 text-xs text-text-dim hover:bg-surface-2"
        >
          + New client
        </button>

        {client && (
          <nav className="flex items-center gap-1 ml-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.id ? 'bg-surface-2 text-text' : 'text-text-dim hover:text-text',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        {!supabaseConfigured && (
          <span className="ml-auto text-xs text-watch">Local storage mode — set VITE_SUPABASE_URL to sync to Supabase</span>
        )}
      </header>

      <main className="flex-1 min-h-0">
        {!client ? (
          <div className="p-8 text-text-faint text-sm">Create a client to get started.</div>
        ) : tab === 'dashboard' ? (
          <Dashboard client={client} refreshKey={refreshKey} />
        ) : tab === 'import' ? (
          <DataImport clientId={client.id} onImported={bumpRefresh} />
        ) : tab === 'manual' ? (
          <ManualEntryGrid ads={ads} onSaved={bumpRefresh} />
        ) : (
          <ClientSettings
            client={client}
            onSaved={() => {
              bumpRefresh()
              loadClients()
            }}
          />
        )}
      </main>

      {showNewClient && (
        <NewClientModal
          onClose={() => setShowNewClient(false)}
          onCreated={async (id) => {
            await loadClients()
            setSelectedClientId(id)
            setShowNewClient(false)
          }}
        />
      )}
    </div>
  )
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [goodMax, setGoodMax] = useState('30')
  const [watchMax, setWatchMax] = useState('60')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const c = await createClient({
        name: name.trim(),
        currency,
        cpl_good_max: Number(goodMax) || 30,
        cpl_watch_max: Number(watchMax) || 60,
      })
      onCreated(c.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">New client</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-faint uppercase tracking-wide">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-faint uppercase tracking-wide">Currency</span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-faint uppercase tracking-wide">Good CPL max</span>
            <input
              type="number"
              value={goodMax}
              onChange={(e) => setGoodMax(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-faint uppercase tracking-wide">Watch CPL max</span>
            <input
              type="number"
              value={watchMax}
              onChange={(e) => setWatchMax(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
