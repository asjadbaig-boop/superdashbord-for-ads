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
  const adSet: AdSet = { id: uid(), created_at: nowIso(), daily_budget: null, ...input }
  db.adSets.push(adSet)
  saveLocal(db)
  return adSet
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
  const ad: Ad = { id: uid(), created_at: nowIso(), status: 'active', ...input }
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
 * writes all the daily entries. Returns a summary for the import confirmation UI.
 */
export async function importParsedRows(
  clientId: string,
  rows: ParsedRow[],
): Promise<{ campaignsCreated: number; adSetsCreated: number; adsCreated: number; entriesWritten: number }> {
  const existingCampaigns = await listCampaigns(clientId)
  const campaignByName = new Map(existingCampaigns.map((c) => [c.name, c]))
  let campaignsCreated = 0
  let adSetsCreated = 0
  let adsCreated = 0

  const adSetByKey = new Map<string, AdSet>() // key: campaignId|adSetName
  const adByKey = new Map<string, Ad>() // key: adSetId|adName

  const entries: Omit<DailyEntry, 'id' | 'created_at'>[] = []

  for (const row of rows) {
    let campaign = campaignByName.get(row.campaignName)
    if (!campaign) {
      campaign = await createCampaign({ client_id: clientId, name: row.campaignName })
      campaignByName.set(row.campaignName, campaign)
      campaignsCreated++
    }

    const adSetKey = `${campaign.id}|${row.adSetName}`
    let adSet = adSetByKey.get(adSetKey)
    if (!adSet) {
      const existing = (await listAdSets(campaign.id)).find((a) => a.name === row.adSetName)
      adSet = existing ?? (await createAdSet({ campaign_id: campaign.id, name: row.adSetName }))
      if (!existing) adSetsCreated++
      adSetByKey.set(adSetKey, adSet)
    }

    const adKey = `${adSet.id}|${row.adName}`
    let ad = adByKey.get(adKey)
    if (!ad) {
      const existing = (await listAds(adSet.id)).find((a) => a.name === row.adName)
      ad =
        existing ??
        (await createAd({
          ad_set_id: adSet.id,
          name: row.adName,
          first_active_date: row.date,
        }))
      if (!existing) adsCreated++
      adByKey.set(adKey, ad)
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

  await upsertEntriesBulk(entries)

  return { campaignsCreated, adSetsCreated, adsCreated, entriesWritten: entries.length }
}
