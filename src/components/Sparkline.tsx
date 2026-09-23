import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyEntry } from '../lib/types'

export function CplSparkline({ entries }: { entries: DailyEntry[] }) {
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(5), // MM-DD
      cpl: e.results > 0 ? Number((e.spend / e.results).toFixed(2)) : null,
    }))

  if (data.every((d) => d.cpl === null)) {
    return <div className="text-xs text-text-faint py-8 text-center">No results yet to trend.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="cplFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b96ab' }} axisLine={{ stroke: '#2a3247' }} tickLine={false} />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            background: '#1a1e2f',
            border: '1px solid #384259',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
          labelStyle={{ color: '#8b96ab' }}
          itemStyle={{ color: '#f8fafc' }}
          formatter={(v) => [`$${v}`, 'CPL']}
        />
        <Area
          type="monotone"
          dataKey="cpl"
          stroke="#818cf8"
          strokeWidth={2}
          fill="url(#cplFill)"
          dot={{ r: 2.5, fill: '#818cf8', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
