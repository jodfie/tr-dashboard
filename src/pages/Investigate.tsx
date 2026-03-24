import { useSearchParams } from 'react-router-dom'

export default function Investigate() {
  const [searchParams] = useSearchParams()
  const targetTime = searchParams.get('t') || new Date().toISOString()
  const windowMin = parseInt(searchParams.get('window') || '15', 10)
  const keyword = searchParams.get('q') || ''

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Investigate</h1>
      <p className="text-muted-foreground">
        Centered on {new Date(targetTime).toLocaleString()} · ±{windowMin}m
        {keyword && ` · "${keyword}"`}
      </p>
    </div>
  )
}
