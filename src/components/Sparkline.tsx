import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyEntry } from '../lib/types'

export function CplSparkline({ entries }: { entries: DailyEntry[] }) {
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(5), // MM-DD
      cpl: e.results > 0 ? Number((e.spend / e.results).toFixed(2)) : null,
    }))

  if (data.every((d) => d.cpl === null)) {
    return <div className="text-xs text-text-faint py-6 text-center">No results yet to trend.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#2a2d35' }} tickLine={false} />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#14161b', border: '1px solid #2a2d35', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v) => [`$${v}`, 'CPL']}
        />
        <Line type="monotone" dataKey="cpl" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
