import { useState } from 'react'
import { parseMetaCsv } from '../lib/csvParser'
import { importParsedRows } from '../lib/store'

export function DataImport({ clientId, onImported }: { clientId: string; onImported: () => void }) {
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

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
    <div className="p-5 flex flex-col gap-3 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Import daily data</h2>
        <p className="text-sm text-text-dim mt-1">
          Export from Ads Manager (breakdown by day, campaign, ad set, ad) and paste the CSV below, or drop the file.
          Matches existing campaigns/ad sets/ads by name and creates whatever's new.
        </p>
      </div>

      <label className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-text-faint cursor-pointer hover:border-accent/50 transition-colors">
        Drop / choose a CSV file
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
        className="rounded-lg border border-border bg-surface-2 p-3 text-xs font-mono resize-y focus:outline-none focus:border-accent"
      />

      {error && <div className="rounded-md border border-kill/30 bg-kill-bg text-kill text-sm px-3 py-2">{error}</div>}
      {summary && <div className="rounded-md border border-good/30 bg-good-bg text-good text-sm px-3 py-2">{summary}</div>}

      <button
        onClick={handleImport}
        disabled={busy}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Importing…' : 'Import'}
      </button>
    </div>
  )
}
