import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs/promises'

/**
 * Format time from HH:MM:SS or HH:MM to HH:MM format
 */
function formatTime(time: string | null): string {
  if (!time) return ''
  if (time.match(/^\d{2}:\d{2}$/)) return time
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5)
  return time
}

/** Format date for display (YYYY-MM-DD or existing string). */
function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? date : String(date)
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10)
  return d
}

/**
 * Compute PSV expiry (next PMI due) from last_pmi_date and pmi_weeks; return formatted date or ''.
 */
function psvExpiryDate(lastPmiDate: string | null | undefined, pmiWeeks: number | null | undefined): string {
  if (!lastPmiDate || !pmiWeeks || pmiWeeks <= 0) return ''
  try {
    const d = new Date(lastPmiDate)
    if (Number.isNaN(d.getTime())) return ''
    d.setDate(d.getDate() + pmiWeeks * 7)
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/**
 * Generate TAS 5 export for a school with all routes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const schoolId = parseInt(params.id)

    if (isNaN(schoolId)) {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      )
    }

    // Fetch school data
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Fetch all routes for this school (basic data first)
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select(`
        id,
        route_number,
        am_start_time,
        pm_start_time,
        pm_start_time_friday,
        driver_id,
        passenger_assistant_id,
        vehicle_id
      `)
      .eq('school_id', schoolId)
      .order('route_number', { ascending: true })

    if (routesError) {
      console.error('[TAS5 Export] Error fetching routes:', routesError)
      return NextResponse.json(
        { error: `Failed to fetch routes: ${routesError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!routes || routes.length === 0) {
      console.warn('[TAS5 Export] No routes found for school:', schoolId)
      // Return empty routes array - template will still be generated
    }

    // Fetch related data for each route
    const routesWithPassengers = await Promise.all(
      (routes || []).map(async (route) => {
        // Fetch driver data if driver_id exists
        let driver = null
        if (route.driver_id) {
          const { data: driverData } = await supabase
            .from('drivers')
            .select(`
              employee_id,
              tas_badge_number,
              tas_badge_expiry_date,
              taxi_badge_number,
              employees (
                id,
                full_name
              )
            `)
            .eq('employee_id', route.driver_id)
            .maybeSingle()
          driver = driverData
        }

        // Fetch PA data if passenger_assistant_id exists
        let pa = null
        if (route.passenger_assistant_id) {
          const { data: paData } = await supabase
            .from('passenger_assistants')
            .select(`
              employee_id,
              tas_badge_number,
              tas_badge_expiry_date,
              employees (
                id,
                full_name
              )
            `)
            .eq('employee_id', route.passenger_assistant_id)
            .maybeSingle()
          pa = paData
        }

        // Fetch vehicle data if vehicle_id exists (include type, PMI for PSV expiry, make/model)
        let vehicle = null
        if (route.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select(`
              id,
              registration,
              plate_number,
              vehicle_identifier,
              make,
              model,
              vehicle_type,
              last_pmi_date,
              pmi_weeks
            `)
            .eq('id', route.vehicle_id)
            .maybeSingle()
          vehicle = vehicleData
          // Fetch active seating plan for capacity / number of seats
          if (vehicleData?.id) {
            const { data: plan } = await supabase
              .from('vehicle_seating_plans')
              .select('total_capacity')
              .eq('vehicle_id', vehicleData.id)
              .eq('is_active', true)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            vehicle = { ...vehicleData, total_capacity: plan?.total_capacity ?? null }
          }
        }

        // Fetch passengers for this route
        const { data: passengers } = await supabase
          .from('passengers')
          .select('id, full_name')
          .eq('route_id', route.id)
          .order('full_name', { ascending: true })

        return {
          ...route,
          driver,
          pa,
          vehicles: vehicle,
          passengers: passengers || [],
        }
      })
    )

    // Load the TAS 5 template
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'TAS 5.xlsx')
    
    // Check if template exists
    try {
      await fs.access(templatePath)
    } catch {
      return NextResponse.json(
        { error: 'TAS 5 template not found. Please ensure TAS 5.xlsx exists in public/templates/' },
        { status: 404 }
      )
    }

    // Load the template
    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.readFile(templatePath)
    } catch (error: any) {
      console.error('[TAS5 Export] Error reading template file:', error)
      return NextResponse.json(
        { error: `Failed to read template file: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }
    
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0]
    
    if (!worksheet) {
      return NextResponse.json(
        { error: 'Worksheet not found in template' },
        { status: 500 }
      )
    }

    console.log(`[TAS5 Export] Loaded template: ${templatePath}`)
    console.log(`[TAS5 Export] Worksheet: ${worksheet.name}, Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`)
    
    // Check if worksheet has Excel Table objects (structured tables)
    // If tables exist, we need to be careful about how we write to cells within them
    // Note: ExcelJS tables are accessed through workbook, not worksheet
    // We're writing to individual cells, which should work fine with Excel tables
    // ExcelJS will automatically update table ranges if we write within them

    // =========================================
    // 📍 CELL LOCATIONS CONFIGURATION
    // =========================================
    // Column order: 1=Route#, 2=School name, 3=Empty, 4=Vehicle ID … 17=PA TAS expiry.
    // No extra header: one row per route, data starts at row 7 (template has its own header).
    const cellLocations = {
      routeTableStartRow: 7,
      column1RouteNumber: 1,
      column2SchoolName: 2,
      column3Empty: 3,
      column4VehicleId: 4,
      column5VehicleRegistration: 5,
      column6NumberOfSeats: 6,
      column7VehicleType: 7,
      column8D1Category: 8,
      column9PsvExpiryDate: 9,
      column10Capacity: 10,
      column11MakeAndModel: 11,
      column12DriverName: 12,
      column13DriverTasNumber: 13,
      column14DriverTasExpiry: 14,
      column15PaName: 15,
      column16PaTasNumber: 16,
      column17PaTasExpiry: 17,
    }

    const loc = cellLocations
    const schoolName = school.name || ''

    console.log(`[TAS5 Export] Writing ${routesWithPassengers.length} route(s) starting at row ${loc.routeTableStartRow}, columns A–Q`)

    routesWithPassengers.forEach((route, index) => {
      const rowIndex = loc.routeTableStartRow + index

      const set = (col: number, value: string | number | null | undefined) => {
        if (value === null || value === undefined) return
        try {
          const v = typeof value === 'number' ? value : String(value).trim()
          if (v !== '') worksheet.getCell(rowIndex, col).value = v
        } catch (e) {
          console.warn(`[TAS5 Export] Error writing column ${col}:`, e)
        }
      }

      // Column 1: Route number
      set(loc.column1RouteNumber, route.route_number ?? null)

      // Column 2: Name of school
      set(loc.column2SchoolName, schoolName)

      // Column 3: Empty for now
      // (leave blank)

      const vehicle = route.vehicles as (typeof route.vehicles) & { total_capacity?: number | null } | null

      // Column 4: Vehicle ID
      if (vehicle?.id != null) set(loc.column4VehicleId, vehicle.id)

      // Column 5: Vehicle registration assigned to this route
      set(loc.column5VehicleRegistration, vehicle?.registration ?? vehicle?.plate_number ?? vehicle?.vehicle_identifier ?? null)

      // Column 6: Number of seats
      if (vehicle?.total_capacity != null) set(loc.column6NumberOfSeats, vehicle.total_capacity)

      // Column 7: Vehicle type
      set(loc.column7VehicleType, vehicle?.vehicle_type ?? null)

      // Column 8: D1 category number (if applicable) – not in schema, leave empty
      // (leave blank)

      // Column 9: PSV expiry date (next PMI due from last_pmi_date + pmi_weeks)
      set(loc.column9PsvExpiryDate, psvExpiryDate(vehicle?.last_pmi_date, vehicle?.pmi_weeks))

      // Column 10: Capacity (same as seats from seating plan)
      if (vehicle?.total_capacity != null) set(loc.column10Capacity, vehicle.total_capacity)

      // Column 11: Make and model of car
      set(loc.column11MakeAndModel, [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || null)

      // Column 12: Driver name
      if (route.driver) {
        const emp = Array.isArray(route.driver.employees) ? route.driver.employees[0] : route.driver.employees
        set(loc.column12DriverName, emp?.full_name ?? null)
      }

      // Column 13: Driver TAS number
      if (route.driver) {
        const tas = route.driver.tas_badge_number ?? route.driver.taxi_badge_number ?? null
        set(loc.column13DriverTasNumber, tas)
      }

      // Column 14: Driver TAS number expiry
      if (route.driver?.tas_badge_expiry_date) {
        set(loc.column14DriverTasExpiry, formatDate(route.driver.tas_badge_expiry_date))
      }

      // Column 15: PA name
      if (route.pa) {
        const emp = Array.isArray(route.pa.employees) ? route.pa.employees[0] : route.pa.employees
        set(loc.column15PaName, emp?.full_name ?? null)
      }

      // Column 16: PA TAS number
      if (route.pa) set(loc.column16PaTasNumber, route.pa.tas_badge_number ?? null)

      // Column 17: PA TAS number expiry
      if (route.pa?.tas_badge_expiry_date) {
        set(loc.column17PaTasExpiry, formatDate(route.pa.tas_badge_expiry_date))
      }
    })

    // =========================================
    // GENERATE FILE AND RETURN
    // =========================================
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Verify buffer is not empty
    if (!buffer || buffer.byteLength === 0) {
      console.error('[TAS5 Export] Generated Excel buffer is empty')
      return NextResponse.json(
        { error: 'Failed to generate Excel file - buffer is empty' },
        { status: 500 }
      )
    }
    
    // Generate filename
    const sanitizedSchoolName = (school.name || 'School')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '')
    const filename = `TAS5_${sanitizedSchoolName}_${new Date().toISOString().split('T')[0]}.xlsx`

    console.log(`[TAS5 Export] Generated file: ${filename} (${buffer.byteLength} bytes)`)

    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error: any) {
    console.error('Error generating TAS 5 export:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate TAS 5 export' },
      { status: 500 }
    )
  }
}
