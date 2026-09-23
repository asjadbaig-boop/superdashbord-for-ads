export type FlagLevel = 'good' | 'watch' | 'kill'

export interface Client {
  id: string
  name: string
  currency: 'USD' | 'INR' | 'MXN' | string
  cpl_good_max: number   // CPL at or below this = good (green)
  cpl_watch_max: number  // CPL at or below this = watch (amber); above = kill (red)
  created_at: string
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  objective: string | null
  created_at: string
}

export interface AdSet {
  id: string
  campaign_id: string
  name: string
  daily_budget: number | null
  notes: string | null // free text — what this ad set is testing / about
  created_at: string
}

export interface Ad {
  id: string
  ad_set_id: string
  name: string
  first_active_date: string // YYYY-MM-DD, used for "days active" — earliest date seen across all imports
  status: 'active' | 'paused' | 'killed'
  notes: string | null // free text — what this creative/ad is about
  closed_date: string | null // YYYY-MM-DD — set when manually closed/stopped; freezes "days active"
  close_reason: string | null // why it was closed, captured when closed_date is set
  created_at: string
}

export interface DailyEntry {
  id: string
  ad_id: string
  date: string // YYYY-MM-DD
  spend: number
  results: number       // leads / conversions
  clicks: number
  impressions: number
  landing_page_views: number
  frequency: number | null
  created_at: string
}

// ---- Derived / computed shapes used across the UI ----

export interface AdMetrics {
  ad: Ad
  entries: DailyEntry[]
  daysActive: number
  totalSpend: number
  totalResults: number
  cpl: number | null // null when zero results
  ctr: number | null
  avgFrequency: number | null
  lpConvRate: number | null
  cplTrend: 'down' | 'up' | 'flat' | 'unknown'
  flag: FlagLevel
  recommendation: Recommendation
}

export interface AdSetMetrics {
  adSet: AdSet
  ads: AdMetrics[]
  totalSpend: number
  totalResults: number
  avgCpl: number | null
  flag: FlagLevel
}

export interface CampaignMetrics {
  campaign: Campaign
  adSets: AdSetMetrics[]
  totalSpend: number
  totalResults: number
  avgCpl: number | null
}

export type RecommendationAction = 'scale' | 'close' | 'review' | 'monitor' | 'keep'

export interface Recommendation {
  action: RecommendationAction
  reason: string
}
