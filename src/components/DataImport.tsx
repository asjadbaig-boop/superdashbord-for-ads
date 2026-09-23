import { useState } from 'react'
import { parseMetaCsv } from '../lib/csvParser'
import { importParsedRows } from '../lib/store'

export function DataImport({ clientId, onImported }: { clientId: string; onImported: () => void }) {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleImport() {
    setError(null)
    setSummary(null)
    if (!raw.trim()) {
      setError('Paste your Ads Manager export first (CSV, tab-separated, or copied table).')
      return
    }
    setBusy(true)
    try {
      const { rows, skipped, headers } = parseMetaCsv(raw)
      if (rows.length === 0) {
        setError(`No usable rows found. Detected columns: ${headers.join(', ') || 'none'}`)
        return
      }
      const result = await importParsedRows(clientId, rows)
      setSummary(
        `Imported ${result.entriesWritten} daily entries across ${rows.length - skipped > 0 ? rows.length - skipped : rows.length} rows` +
          (skipped ? ` (${skipped} skipped — missing ad name or date)` : '') +
          `. New: ${result.campaignsCreated} campaign(s), ${result.adSetsCreated} ad set(s), ${result.adsCreated} ad(s).`,
      )
      setRaw('')
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setRaw(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <div className="p-6 flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Import daily data</h2>
        <p className="text-sm text-text-dim mt-1.5 leading-relaxed">
          Export from Ads Manager (breakdown by day, campaign, ad set, ad) and paste the CSV below, or drop the file.
          Matches existing campaigns/ad sets/ads by name and creates whatever's new.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-sm text-text-faint cursor-pointer transition-colors flex flex-col items-center gap-2 text-center ${
          dragOver ? 'border-accent bg-accent-bg' : 'border-border bg-surface-2/60 hover:border-accent/50'
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          <span className="text-text font-medium">Click to choose</span> or drop a CSV file here
        </span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste CSV rows here — first row must be the header row from Ads Manager"
        rows={12}
        className="rounded-xl border border-border bg-surface-2/60 p-3.5 text-xs font-mono resize-y focus:outline-none focus:border-accent focus:bg-surface-2 transition-colors"
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-kill/30 bg-kill-bg text-kill text-sm px-3.5 py-2.5">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
      {summary && (
        <div className="flex items-start gap-2 rounded-lg border border-good/30 bg-good-bg text-good text-sm px-3.5 py-2.5">
          <span>✓</span>
          <span>{summary}</span>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={busy}
        className="self-start rounded-lg bg-accent hover:bg-accent-hover transition-colors px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg shadow-accent/20"
      >
        {busy ? 'Importing…' : 'Import'}
      </button>
    </div>
  )
}
