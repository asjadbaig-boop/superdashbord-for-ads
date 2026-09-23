import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { Ad, AdSet, Client } from './lib/types'
import { createClient, listAllAdsForClient, listClients } from './lib/store'
import { supabaseConfigured } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { DataImport } from './components/DataImport'
import { ManualEntryGrid } from './components/ManualEntryGrid'
import { ClientSettings } from './components/ClientSettings'

type Tab = 'dashboard' | 'import' | 'manual' | 'settings'

const TABS: [Tab, string][] = [
  ['dashboard', 'Dashboard'],
  ['import', 'Import Data'],
  ['manual', 'Manual Entry'],
  ['settings', 'Settings'],
]

function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [ads, setAds] = useState<Ad[]>([])
  const [adSets, setAdSets] = useState<AdSet[]>([])
  const [manualAdSetId, setManualAdSetId] = useState<string | null>(null)

  async function loadClients() {
    const list = await listClients()
    setClients(list)
    if (!clientId && list.length > 0) setClientId(list[0].id)
  }

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const client = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId])

  useEffect(() => {
    if (!client) return
    listAllAdsForClient(client.id).then(({ ads, adSets }) => {
      setAds(ads)
      setAdSets(adSets)
      if (!manualAdSetId && adSets.length > 0) setManualAdSetId(adSets[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, refreshKey])

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-surface/80 backdrop-blur-sm px-5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shrink-0 shadow-lg shadow-accent/30">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 17l6-6 4 4 8-8M21 7v6h-6"
                stroke="white"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-sm font-bold tracking-tight">
            AdsByAsjad <span className="text-text-faint font-medium">· Tracker</span>
          </div>
        </div>

        <div className="h-5 w-px bg-border" />

        <ClientPicker clients={clients} clientId={clientId} onChange={setClientId} onCreated={loadClients} />

        {client && (
          <nav className="flex items-center gap-1 ml-1 bg-surface-2/60 rounded-lg p-1">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                  tab === id ? 'bg-accent text-white shadow-sm' : 'text-text-faint hover:text-text hover:bg-surface-3/60',
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs font-medium">
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              supabaseConfigured ? 'bg-good shadow-[0_0_6px] shadow-good' : 'bg-watch shadow-[0_0_6px] shadow-watch',
            )}
          />
          <span className={supabaseConfigured ? 'text-good' : 'text-watch'}>
            {supabaseConfigured ? 'Connected to Supabase' : 'Local mode'}
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {!client ? (
          <div className="p-8 text-sm text-text-faint">Add a client above to get started.</div>
        ) : tab === 'dashboard' ? (
          <Dashboard client={client} refreshKey={refreshKey} />
        ) : tab === 'import' ? (
          <DataImport clientId={client.id} onImported={refresh} />
        ) : tab === 'manual' ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-6 pt-5">
              <span className="text-[11px] text-text-faint uppercase tracking-wider font-semibold">Ad set</span>
              <select
                value={manualAdSetId ?? ''}
                onChange={(e) => setManualAdSetId(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                {adSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <ManualEntryGrid ads={ads.filter((a) => a.ad_set_id === manualAdSetId)} onSaved={refresh} />
          </div>
        ) : (
          <ClientSettings client={client} onSaved={loadClients} />
        )}
      </main>
    </div>
  )
}

function ClientPicker({
  clients,
  clientId,
  onChange,
  onCreated,
}: {
  clients: Client[]
  clientId: string | null
  onChange: (id: string) => void
  onCreated: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  async function add() {
    if (!name.trim()) return
    const c = await createClient({ name: name.trim(), currency: 'USD', cpl_good_max: 30, cpl_watch_max: 60 })
    setName('')
    setAdding(false)
    onCreated()
    onChange(c.id)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={clientId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium min-w-[140px] focus:outline-none focus:border-accent transition-colors"
      >
        {clients.length === 0 && <option value="">No clients yet</option>}
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {adding ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Client name"
            className="rounded-lg border border-accent/50 bg-surface-2 px-2.5 py-1.5 text-sm w-40 focus:outline-none focus:border-accent"
          />
          <button onClick={add} className="text-xs text-accent font-semibold px-2 py-1.5 hover:bg-accent-bg rounded-md transition-colors">
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-text-faint px-2 py-1.5 hover:bg-surface-3 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs font-semibold text-text-faint hover:text-text border border-border hover:border-border-strong rounded-lg px-2.5 py-1.5 transition-colors"
        >
          + Client
        </button>
      )}
    </div>
  )
}

export default App
