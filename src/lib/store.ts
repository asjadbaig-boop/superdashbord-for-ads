import { supabase, supabaseConfigured } from './supabase'
import type { Ad, AdSet, Campaign, Client, DailyEntry } from './types'
import type { ParsedRow } from './csvParser'

/**
 * Data layer. Uses Supabase when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are set (see .env.example + supabase/schema.sql). Falls back to
 * localStorage otherwise, so the dashboard runs immediately without any
 * backend setup — swap in Supabase whenever you're ready and the data
 * shape is identical.
 */

const LS_KEY = 'adsbyasjad_tracker_v1'

interface LocalDB {
  clients: Client[]
  campaigns: Campaign[]
  adSets: AdSet[]
  ads: Ad[]
  entries: DailyEntry[]
}

function emptyDb(): LocalDB {
  return { clients: [], campaigns: [], adSets: [], ads: [], entries: [] }
}

function loadLocal(): LocalDB {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyDb()
    return { ...emptyDb(), ...JSON.parse(raw) }
  } catch {
    return emptyDb()
  }
}

function saveLocal(db: LocalDB) {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
}

function uid() {
  return crypto.randomUUID()
}
function nowIso() {
  return new Date().toISOString()
}

// ---------- Clients ----------

export async function listClients(): Promise<Client[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('clients').select('*').order('name')
    if (error) throw error
    return data as Client[]
  }
  return loadLocal().clients
}

export async function createClient(input: {
  name: string
  currency: string
  cpl_good_max: number
  cpl_watch_max: number
}): Promise<Client> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('clients').insert(input).select().single()
    if (error) throw error
    return data as Client
  }
  const db = loadLocal()
  const client: Client = { id: uid(), created_at: nowIso(), ...input }
  db.clients.push(client)
  saveLocal(db)
  return client
}

export async function updateClientThresholds(
  id: string,
  patch: Partial<Pick<Client, 'cpl_good_max' | 'cpl_watch_max' | 'currency' | 'name'>>,
): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('clients').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.clients = db.clients.map((c) => (c.id === id ? { ...c, ...patch } : c))
  saveLocal(db)
}

// ---------- Campaigns ----------

export async function listCampaigns(clientId: string): Promise<Campaign[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('campaigns').select('*').eq('client_id', clientId)
    if (error) throw error
    return data as Campaign[]
  }
  return loadLocal().campaigns.filter((c) => c.client_id === clientId)
}

export async function createCampaign(input: { client_id: string; name: string; objective?: string }): Promise<Campaign> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('campaigns').insert(input).select().single()
    if (error) throw error
    return data as Campaign
  }
  const db = loadLocal()
  const campaign: Campaign = { id: uid(), created_at: nowIso(), objective: null, ...input }
  db.campaigns.push(campaign)
  saveLocal(db)
  return campaign
}

// ---------- Ad Sets ----------

export async function listAdSets(campaignId: string): Promise<AdSet[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ad_sets').select('*').eq('campaign_id', campaignId)
    if (error) throw error
    return data as AdSet[]
  }
  return loadLocal().adSets.filter((a) => a.campaign_id === campaignId)
}

export async function createAdSet(input: { campaign_id: string; name: string; daily_budget?: number }): Promise<AdSet> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ad_sets').insert(input).select().single()
    if (error) throw error
    return data as AdSet
  }
  const db = loadLocal()
  const adSet: AdSet = { id: uid(), created_at: nowIso(), daily_budget: null, notes: null, ...input }
  db.adSets.push(adSet)
  saveLocal(db)
  return adSet
}

export async function updateAdSetNotes(id: string, notes: string): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('ad_sets').update({ notes }).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.adSets = db.adSets.map((s) => (s.id === id ? { ...s, notes } : s))
  saveLocal(db)
}

// ---------- Ads ----------

export async function listAds(adSetId: string): Promise<Ad[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('ads').select('*').eq('ad_set_id', adSetId)
    if (error) throw error
    return data as Ad[]
  }
  return loadLocal().ads.filter((a) => a.ad_set_id === adSetId)
}

export async function listAllAdsForClient(clientId: string): Promise<{ ads: Ad[]; adSets: AdSet[]; campaigns: Campaign[] }> {
  const campaigns = await listCampaigns(clientId)
  const adSets: AdSet[] = []
  for (const c of campaigns) adSets.push(...(await listAdSets(c.id)))
  const ads: Ad[] = []
  for (const s of adSets) ads.push(...(await listAds(s.id)))
  return { ads, adSets, campaigns }
}

export async function createAd(input: {
  ad_set_id: string
  name: string
  first_active_date: string
  status?: Ad['status']
}): Promise<Ad> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('ads')
      .insert({ status: 'active', ...input })
      .select()
      .single()
    if (error) throw error
    return data as Ad
  }
  const db = loadLocal()
  const ad: Ad = { id: uid(), created_at: nowIso(), status: 'active', notes: null, closed_date: null, close_reason: null, ...input }
  db.ads.push(ad)
  saveLocal(db)
  return ad
}

export async function setAdStatus(id: string, status: Ad['status']): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('ads').update({ status }).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.ads = db.ads.map((a) => (a.id === id ? { ...a, status } : a))
  saveLocal(db)
}

/** Manually stop/close an ad: freezes its "days active" as of closedDate and records why. */
export async function closeAd(id: string, closedDate: string, reason: string): Promise<void> {
  const patch = { status: 'killed' as const, closed_date: closedDate, close_reason: reason }
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('ads').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.ads = db.ads.map((a) => (a.id === id ? { ...a, ...patch } : a))
  saveLocal(db)
}

/** Reopens a manually-closed ad: back to active, clears closed_date/close_reason. */
export async function reopenAd(id: string): Promise<void> {
  const patch = { status: 'active' as const, closed_date: null, close_reason: null }
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('ads').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.ads = db.ads.map((a) => (a.id === id ? { ...a, ...patch } : a))
  saveLocal(db)
}

/** Patch an ad's first_active_date (backfilled by an earlier import) and/or notes. */
export async function updateAdFields(id: string, patch: Partial<Pick<Ad, 'first_active_date' | 'notes'>>): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('ads').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  const db = loadLocal()
  db.ads = db.ads.map((a) => (a.id === id ? { ...a, ...patch } : a))
  saveLocal(db)
}

// ---------- Daily Entries ----------

export async function listEntries(adId: string): Promise<DailyEntry[]> {
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.from('daily_entries').select('*').eq('ad_id', adId).order('date')
    if (error) throw error
    return data as DailyEntry[]
  }
  return loadLocal().entries.filter((e) => e.ad_id === adId).sort((a, b) => a.date.localeCompare(b.date))
}

export async function listAllEntriesForAds(adIds: string[]): Promise<Record<string, DailyEntry[]>> {
  const result: Record<string, DailyEntry[]> = {}
  if (supabaseConfigured && supabase) {
    if (adIds.length === 0) return result
    const { data, error } = await supabase.from('daily_entries').select('*').in('ad_id', adIds)
    if (error) throw error
    for (const e of data as DailyEntry[]) {
      result[e.ad_id] = result[e.ad_id] || []
      result[e.ad_id].push(e)
    }
    return result
  }
  const all = loadLocal().entries
  for (const id of adIds) result[id] = all.filter((e) => e.ad_id === id)
  return result
}

export async function upsertEntry(input: Omit<DailyEntry, 'id' | 'created_at'>): Promise<void> {
  if (supabaseConfigured && supabase) {
    const { error } = await supabase.from('daily_entries').upsert(input, { onConflict: 'ad_id,date' })
    if (error) throw error
    return
  }
  const db = loadLocal()
  const idx = db.entries.findIndex((e) => e.ad_id === input.ad_id && e.date === input.date)
  if (idx >= 0) {
    db.entries[idx] = { ...db.entries[idx], ...input }
  } else {
    db.entries.push({ id: uid(), created_at: nowIso(), ...input })
  }
  saveLocal(db)
}

export async function upsertEntriesBulk(inputs: Omit<DailyEntry, 'id' | 'created_at'>[]): Promise<void> {
  for (const input of inputs) {
    await upsertEntry(input)
  }
}

// ---------- CSV import reconciliation ----------

/**
 * Takes parsed CSV rows for one client and reconciles them against existing
 * campaigns/ad sets/ads by name (creating whatever doesn't exist yet), then
 * writes daily entries.
 *
 * Two rules this enforces:
 *  1. "First active" date = the EARLIEST date seen for that ad across the
 *     whole import (not just whichever row happened to come first in the
 *     file) — and if a later import reveals an even earlier date for an ad
 *     that already exists, its first_active_date is backfilled.
 *  2. A date that already has an entry for that ad is left untouched —
 *     re-uploading a CSV that overlaps previous uploads only fills in the
 *     NEW dates, it never overwrites a day you already have.
 */
export async function importParsedRows(
  clientId: string,
  rows: ParsedRow[],
): Promise<{
  campaignsCreated: number
  adSetsCreated: number
  adsCreated: number
  entriesWritten: number
  duplicatesSkipped: number
}> {
  const existingCampaigns = await listCampaigns(clientId)
  const campaignByName = new Map(existingCampaigns.map((c) => [c.name, c]))
  let campaignsCreated = 0
  let adSetsCreated = 0
  let adsCreated = 0
  let duplicatesSkipped = 0

  // Group rows by campaign/ad set/ad so each ad's earliest date across the
  // whole import is known before that ad is created or backfilled.
  interface Group {
    campaignName: string
    adSetName: string
    adName: string
    rows: ParsedRow[]
    minDate: string
  }
  const groups = new Map<string, Group>()
  for (const row of rows) {
    const key = `${row.campaignName}|||${row.adSetName}|||${row.adName}`
    const g = groups.get(key)
    if (!g) {
      groups.set(key, { campaignName: row.campaignName, adSetName: row.adSetName, adName: row.adName, rows: [row], minDate: row.date })
    } else {
      g.rows.push(row)
      if (row.date < g.minDate) g.minDate = row.date
    }
  }

  const adSetByKey = new Map<string, AdSet>() // key: campaignId|adSetName
  const resolvedAds: { ad: Ad; rows: ParsedRow[] }[] = []

  for (const group of groups.values()) {
    let campaign = campaignByName.get(group.campaignName)
    if (!campaign) {
      campaign = await createCampaign({ client_id: clientId, name: group.campaignName })
      campaignByName.set(group.campaignName, campaign)
      campaignsCreated++
    }

    const adSetKey = `${campaign.id}|${group.adSetName}`
    let adSet = adSetByKey.get(adSetKey)
    if (!adSet) {
      const existing = (await listAdSets(campaign.id)).find((a) => a.name === group.adSetName)
      adSet = existing ?? (await createAdSet({ campaign_id: campaign.id, name: group.adSetName }))
      if (!existing) adSetsCreated++
      adSetByKey.set(adSetKey, adSet)
    }

    const existingAd = (await listAds(adSet.id)).find((a) => a.name === group.adName)
    let ad: Ad
    if (!existingAd) {
      ad = await createAd({ ad_set_id: adSet.id, name: group.adName, first_active_date: group.minDate })
      adsCreated++
    } else {
      ad = existingAd
      if (group.minDate < ad.first_active_date) {
        await updateAdFields(ad.id, { first_active_date: group.minDate })
        ad = { ...ad, first_active_date: group.minDate }
      }
    }

    resolvedAds.push({ ad, rows: group.rows })
  }

  // Only write entries for dates that don't already exist for that ad.
  const existingEntriesByAd = await listAllEntriesForAds(resolvedAds.map((r) => r.ad.id))
  const entries: Omit<DailyEntry, 'id' | 'created_at'>[] = []

  for (const { ad, rows: adRows } of resolvedAds) {
    const existingDates = new Set((existingEntriesByAd[ad.id] ?? []).map((e) => e.date))
    for (const row of adRows) {
      if (existingDates.has(row.date)) {
        duplicatesSkipped++
        continue
      }
      entries.push({
        ad_id: ad.id,
        date: row.date,
        spend: row.spend,
        results: row.results,
        clicks: row.clicks,
        impressions: row.impressions,
        landing_page_views: row.landingPageViews,
        frequency: row.frequency,
      })
    }
  }

  await upsertEntriesBulk(entries)

  return { campaignsCreated, adSetsCreated, adsCreated, entriesWritten: entries.length, duplicatesSkipped }
}
