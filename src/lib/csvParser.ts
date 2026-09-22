import Papa from 'papaparse'

export interface ParsedRow {
  date: string // YYYY-MM-DD
  campaignName: string
  adSetName: string
  adName: string
  spend: number
  results: number
  clicks: number
  impressions: number
  landingPageViews: number
  frequency: number | null
}

const COLUMN_ALIASES: Record<keyof Omit<ParsedRow, 'date'>, string[]> = {
  campaignName: ['Campaign name'],
  adSetName: ['Ad set name'],
  adName: ['Ad name'],
  spend: ['Amount spent (USD)', 'Amount spent', 'Spend'],
  results: ['Results'],
  clicks: ['Link clicks', 'Clicks (all)'],
  impressions: ['Impressions'],
  landingPageViews: ['Landing page views'],
  frequency: ['Frequency'],
}

const DATE_ALIASES = ['Reporting starts', 'Date', 'Day']

function findColumn(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const hit = headers.find((h) => h.trim().toLowerCase() === alias.toLowerCase())
    if (hit) return hit
  }
  return null
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

/**
 * Parses a raw Meta Ads Manager CSV/table export (paste or file) into
 * normalized rows keyed by campaign/ad set/ad name + date. Handles the
 * standard "Reporting starts, Reporting ends, Ad name, Campaign name,
 * Ad set name, Amount spent (USD), Link clicks, Landing page views,
 * Impressions, Frequency, Results, ..." export shape.
 */
export function parseMetaCsv(raw: string): { rows: ParsedRow[]; skipped: number; headers: string[] } {
  const result = Papa.parse<Record<string, string>>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  const headers = result.meta.fields ?? []
  const dateCol = findColumn(headers, DATE_ALIASES)
  const campaignCol = findColumn(headers, COLUMN_ALIASES.campaignName)
  const adSetCol = findColumn(headers, COLUMN_ALIASES.adSetName)
  const adCol = findColumn(headers, COLUMN_ALIASES.adName)
  const spendCol = findColumn(headers, COLUMN_ALIASES.spend)
  const resultsCol = findColumn(headers, COLUMN_ALIASES.results)
  const clicksCol = findColumn(headers, COLUMN_ALIASES.clicks)
  const impressionsCol = findColumn(headers, COLUMN_ALIASES.impressions)
  const lpvCol = findColumn(headers, COLUMN_ALIASES.landingPageViews)
  const freqCol = findColumn(headers, COLUMN_ALIASES.frequency)

  if (!dateCol || !campaignCol || !adSetCol || !adCol) {
    throw new Error(
      'Could not find required columns (date, Campaign name, Ad set name, Ad name). Check the export includes these fields.',
    )
  }

  const rows: ParsedRow[] = []
  let skipped = 0

  for (const line of result.data) {
    const adName = line[adCol]?.trim()
    const dateRaw = line[dateCol]?.trim()
    if (!adName || !dateRaw) {
      skipped++
      continue
    }
    rows.push({
      date: dateRaw,
      campaignName: line[campaignCol]?.trim() || 'Unnamed Campaign',
      adSetName: line[adSetCol]?.trim() || 'Unnamed Ad Set',
      adName,
      spend: toNumber(spendCol ? line[spendCol] : 0),
      results: toNumber(resultsCol ? line[resultsCol] : 0),
      clicks: toNumber(clicksCol ? line[clicksCol] : 0),
      impressions: toNumber(impressionsCol ? line[impressionsCol] : 0),
      landingPageViews: toNumber(lpvCol ? line[lpvCol] : 0),
      frequency: freqCol && line[freqCol] ? toNumber(line[freqCol]) : null,
    })
  }

  return { rows, skipped, headers }
}
