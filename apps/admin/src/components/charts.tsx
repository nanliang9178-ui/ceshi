import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fenShort } from '../lib/utils';

const PALETTE = ['#FF5A1F', '#F2B544', '#2E90FA', '#12B76A', '#8B5CF6', '#F04438', '#0EA5E9', '#64748B'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #EDE7E0',
  boxShadow: '0 12px 32px -16px rgba(23,24,28,.25)',
  fontSize: 12,
  padding: '8px 12px',
};

export function RevenueAreaChart({
  data,
  height = 240,
}: {
  data: Array<{ date: string; amount: number; count?: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="#EDE7E0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => value.slice(5)}
          tick={{ fontSize: 11, fill: '#9E9E9E' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => fenShort(value)}
          tick={{ fontSize: 11, fill: '#9E9E9E' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`¥${(value / 100).toFixed(2)}`, '营业额']}
          labelFormatter={(label: string) => `${label}`}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#FF5A1F"
          strokeWidth={2.4}
          fill="url(#revenueFill)"
          dot={{ r: 3, fill: '#fff', stroke: '#FF5A1F', strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HourBarChart({ data }: { data: Array<{ hour: number; amount: number; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 6" stroke="#EDE7E0" vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={(value: number) => `${value}时`}
          tick={{ fontSize: 10, fill: '#9E9E9E' }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tickFormatter={(value: number) => fenShort(value)}
          tick={{ fontSize: 11, fill: '#9E9E9E' }}
          axisLine={false}
          tickLine={false}
          width={46}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`¥${(value / 100).toFixed(2)}`, '营业额']}
          labelFormatter={(label: number) => `${label}:00 - ${label + 1}:00`}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.hour} fill={entry.amount > 0 ? '#FF5A1F' : '#F3EBE3'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data }: { data: Array<{ name: string; amount: number }> }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`¥${(value / 100).toFixed(2)}`, '营业额']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-ink-900/65">{item.name}</span>
            <span className="num text-ink-900/45">
              {total > 0 ? `${Math.round((item.amount / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
