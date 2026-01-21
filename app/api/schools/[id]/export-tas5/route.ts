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
  // If already in HH:MM format, return as is
  if (time.match(/^\d{2}:\d{2}$/)) return time
  // If in HH:MM:SS format, extract HH:MM
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5)
  return time
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
              employees (
                id,
                full_name
              )
            `)
            .eq('id', route.passenger_assistant_id)
            .maybeSingle()
          pa = paData
        }

        // Fetch vehicle data if vehicle_id exists
        let vehicle = null
        if (route.vehicle_id) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select(`
              id,
              registration,
              plate_number,
              vehicle_identifier,
              taxi_badge_number
            `)
            .eq('id', route.vehicle_id)
            .maybeSingle()
          vehicle = vehicleData
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
    // ⚠️ IMPORTANT: Update these cell locations to match your TAS 5.xlsx template!
    // 
    // HOW TO FIND CELL LOCATIONS:
    // 1. Open your TAS 5.xlsx template in Excel
    // 2. Click on the cell where you want data to appear
    // 3. Look at the cell reference in the formula bar (e.g., "B2", "C5", etc.)
    // 4. Update the corresponding value below
    //
    // NOTE: Nothing should be filled before row 7. Route data starts at row 7.
    //
    const cellLocations = {
      // =========================================
      // ROUTE TABLE STRUCTURE
      // =========================================
      // routeTableStartRow: The row number where the FIRST route data starts
      // IMPORTANT: Nothing should be filled before this row!
      // 
      // HOW MULTIPLE ROWS WORK:
      // - Route 1 (index 0) → Row = routeTableStartRow + 0 = 7
      // - Route 2 (index 1) → Row = routeTableStartRow + 1 = 8
      // - Route 3 (index 2) → Row = routeTableStartRow + 2 = 9
      // - And so on...
      //
      // So if you have 5 routes and routeTableStartRow is 7:
      // Routes will fill rows 7, 8, 9, 10, 11
      //
      routeTableStartRow: 7,  // ← Route table starts at row 7 (nothing filled before this)
      
      // =========================================
      // ROUTE FIELD COLUMNS
      // =========================================
      // These are COLUMN NUMBERS (1=A, 2=B, 3=C, 4=D, 5=E, 6=F, 7=G, 8=H, 9=I, 10=J, 11=K, 12=L, etc.)
      // Update these to match which columns in your template contain each field
      //
      // EXAMPLE LAYOUT:
      // Row 7:  | FPS | Route # | Start Time | End Time | Driver | Driver TAS | PA | PA TAS | Vehicle | ...
      //         |Col 1|  Col 2  |    Col 3   |  Col 4   | Col 5 |   Col 6    |Col7| Col 8  |  Col 9  | ...
      //
      fpsColumn: 1,                    // Column A (1) - FPS Number (from school table)
      routeNumberColumn: 2,            // Column B (2) - Route Number
      routeStartTimeColumn: 3,         // Column C (3) - AM Start Time
      routeEndTimeColumn: 4,           // Column D (4) - PM End Time
      driverNameColumn: 5,             // Column E (5) - Driver Name
      driverTasColumn: 6,              // Column F (6) - Driver TAS Number
      paNameColumn: 7,                 // Column G (7) - PA Name
      paTasColumn: 8,                  // Column H (8) - PA TAS Number
      vehicleRegColumn: 9,             // Column I (9) - Vehicle Registration
      vehiclePlateColumn: 10,            // Column J (10) - Vehicle Plate Number
      passengerCountColumn: 11,        // Column K (11) - Passenger Count
      routeNotesColumn: 12,            // Column L (12) - Route Notes
    }

    // Get FPS from school (using ref_number as FPS, or you can add a dedicated fps field later)
    const schoolFps = school.ref_number || (school as any).fps || ''

    // =========================================
    // FILL ROUTE DATA
    // =========================================
    // IMPORTANT: Nothing is filled before row 7. Route data starts at row 7.
    // 
    // HOW MULTIPLE ROWS ARE FILLED:
    // The script loops through each route and fills it in a separate row.
    // Row calculation: rowIndex = routeTableStartRow + routeIndex
    //
    // EXAMPLE with routeTableStartRow = 7:
    // - Route 0 → Row 7 (7 + 0)
    // - Route 1 → Row 8 (7 + 1)
    // - Route 2 → Row 9 (7 + 2)
    // - Route 3 → Row 10 (7 + 3)
    //
    // Each route's data is filled across the columns specified in cellLocations
    routesWithPassengers.forEach((route, index) => {
      // Calculate which row this route should be filled in
      // First route (index 0) = routeTableStartRow
      // Second route (index 1) = routeTableStartRow + 1
      // Third route (index 2) = routeTableStartRow + 2
      // And so on...
      const rowIndex = cellLocations.routeTableStartRow + index

      // FPS Number (from school table - same for all routes)
      if (schoolFps) {
        worksheet.getCell(rowIndex, cellLocations.fpsColumn).value = schoolFps
      }

      // Route Number
      if (route.route_number) {
        try {
          worksheet.getCell(rowIndex, cellLocations.routeNumberColumn).value = String(route.route_number).trim()
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing route number:`, error)
        }
      }

      // Start Time (AM)
      if (route.am_start_time) {
        try {
          const timeValue = formatTime(route.am_start_time)
          if (timeValue) {
            worksheet.getCell(rowIndex, cellLocations.routeStartTimeColumn).value = timeValue
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing start time:`, error)
        }
      }

      // End Time (PM)
      if (route.pm_start_time) {
        try {
          const timeValue = formatTime(route.pm_start_time)
          if (timeValue) {
            worksheet.getCell(rowIndex, cellLocations.routeEndTimeColumn).value = timeValue
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing end time:`, error)
        }
      }

      // Driver Name
      if (route.driver) {
        try {
          const driver = route.driver
          const employees = Array.isArray(driver.employees) ? driver.employees[0] : driver.employees
          const driverName = employees?.full_name || ''
          if (driverName) {
            worksheet.getCell(rowIndex, cellLocations.driverNameColumn).value = String(driverName).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing driver name:`, error)
        }
      }

      // Driver TAS Number
      if (route.driver) {
        try {
          const driver = route.driver
          const driverTas = driver?.tas_badge_number || driver?.taxi_badge_number || ''
          if (driverTas) {
            worksheet.getCell(rowIndex, cellLocations.driverTasColumn).value = String(driverTas).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing driver TAS:`, error)
        }
      }

      // Passenger Assistant Name
      if (route.pa) {
        try {
          const pa = route.pa
          const employees = Array.isArray(pa.employees) ? pa.employees[0] : pa.employees
          const paName = employees?.full_name || ''
          if (paName) {
            worksheet.getCell(rowIndex, cellLocations.paNameColumn).value = String(paName).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing PA name:`, error)
        }
      }

      // Passenger Assistant TAS Number
      if (route.pa) {
        try {
          const pa = route.pa
          const paTas = pa?.tas_badge_number || ''
          if (paTas) {
            worksheet.getCell(rowIndex, cellLocations.paTasColumn).value = String(paTas).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing PA TAS:`, error)
        }
      }

      // Vehicle Registration
      if (route.vehicles) {
        try {
          const vehicle = route.vehicles
          const vehicleReg = vehicle?.registration || vehicle?.plate_number || vehicle?.vehicle_identifier || ''
          if (vehicleReg) {
            worksheet.getCell(rowIndex, cellLocations.vehicleRegColumn).value = String(vehicleReg).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing vehicle registration:`, error)
        }
      }

      // Vehicle Plate Number
      if (route.vehicles) {
        try {
          const vehicle = route.vehicles
          const vehiclePlate = vehicle?.plate_number || vehicle?.registration || ''
          if (vehiclePlate) {
            worksheet.getCell(rowIndex, cellLocations.vehiclePlateColumn).value = String(vehiclePlate).trim()
          }
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing vehicle plate:`, error)
        }
      }

      // Passenger Count
      if (route.passengers && Array.isArray(route.passengers)) {
        try {
          worksheet.getCell(rowIndex, cellLocations.passengerCountColumn).value = route.passengers.length
        } catch (error) {
          console.warn(`[TAS5 Export] Error writing passenger count:`, error)
        }
      }

      // Route Notes (if notes column exists in routes table, uncomment below)
      // if (route.notes) {
      //   worksheet.getCell(rowIndex, cellLocations.routeNotesColumn).value = route.notes
      // }
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
