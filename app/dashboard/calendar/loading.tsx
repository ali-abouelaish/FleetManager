import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-96 bg-slate-100 rounded animate-pulse" />
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden h-[400px]" />
        </CardContent>
      </Card>
    </div>
  )
}
