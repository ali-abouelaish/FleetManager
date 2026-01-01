import { NextRequest, NextResponse } from 'next/server'
import { getVehicleSeatingPlan } from '@/lib/supabase/vehicleSeating'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seatingPlan = await getVehicleSeatingPlan(params.id)

    return NextResponse.json({ 
      success: true, 
      seatingPlan: seatingPlan 
    })
  } catch (error) {
    console.error('Error in seating plan API:', error)
    return NextResponse.json(
      { error: 'Internal server error', seatingPlan: null },
      { status: 500 }
    )
  }
}

