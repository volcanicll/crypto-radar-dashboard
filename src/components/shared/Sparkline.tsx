import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: number[]
  color?: string
  height?: number
}

export default function Sparkline({ data, color = 'var(--accent)', height = 24 }: Props) {
  if (!data || data.length < 2) return null
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
