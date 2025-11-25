import { createClient } from '@/lib/supabase/server'
import DailySummariesClient from './DailySummariesClient'

async function getDailySummaries(date: string) {
  const supabase = await createClient()
  
  // Try querying the view directly first (more reliable)
  const { data: viewData, error: viewError } = await supabase
    .from('daily_route_summaries')
    .select('*')
    .eq('session_date', date)
    .order('route_name', { ascending: true })
    .order('session_type', { ascending: true })

  if (!viewError && viewData) {
    // Ensure incident_refs is always an array and incident_count is a number
    return viewData.map((item: any) => ({
      ...item,
      incident_count: item.incident_count || 0,
      incident_refs: Array.isArray(item.incident_refs) 
        ? item.incident_refs.filter((ref: any) => ref !== null && ref !== undefined)
        : []
    }))
  }

  // Fallback: Use the RPC function
  if (viewError) {
    console.error('Error fetching from view, trying RPC:', viewError)
    const { data, error } = await supabase
      .rpc('get_daily_route_summaries', { p_date: date })

    if (error) {
      console.error('Error fetching daily summaries from RPC:', error)
      return []
    }

    return data || []
  }

  return []
}

export default async function DailySummariesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params.date || new Date().toISOString().split('T')[0]
  const summaries = await getDailySummaries(selectedDate)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Daily Summaries</h1>
          <p className="mt-2 text-sm text-gray-600">
            View route session summaries with attendance and incidents
          </p>
        </div>
      </div>

      <DailySummariesClient initialDate={selectedDate} initialSummaries={summaries} />
    </div>
  )
}

