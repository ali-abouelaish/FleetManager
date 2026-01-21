/**
 * TAS 5 Excel Template Filler
 * Fills the TAS 5 template with route details from school profile
 * while preserving all formatting, borders, and structure
 */

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Format time from HH:MM:SS or HH:MM to HH:MM format
 * @param {string} time - Time string
 * @returns {string} - Formatted time or empty string
 */
function formatTime(time) {
  if (!time) return '';
  // If already in HH:MM format, return as is
  if (time.match(/^\d{2}:\d{2}$/)) return time;
  // If in HH:MM:SS format, extract HH:MM
  if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time.substring(0, 5);
  return time;
}

/**
 * Format date to DD/MM/YYYY
 * @param {string|Date} date - Date string or Date object
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Fill the TAS 5 template with route data
 * @param {Object} options - Configuration options
 */
async function fillTAS5Template(options) {
  const {
    // Input/Output files
    templatePath = './TAS 5.xlsx',
    outputPath = './TAS5_filled.xlsx',
    
    // School data
    schoolFps, // FPS number from school table (usually ref_number)
    
    // Route data (can be single route or array of routes)
    routes = [], // Array of route objects
    
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
    cellLocations = {
      // =========================================
      // ROUTE TABLE STRUCTURE
      // =========================================
      // routeTableStartRow: The row number where the FIRST route data starts
      // Example: If your route table starts at row 10, set routeTableStartRow: 10
      // 
      // HOW MULTIPLE ROWS WORK:
      // - Route 1 (index 0) → Row = routeTableStartRow + 0 = 10
      // - Route 2 (index 1) → Row = routeTableStartRow + 1 = 11
      // - Route 3 (index 2) → Row = routeTableStartRow + 2 = 12
      // - And so on...
      //
      // So if you have 5 routes and routeTableStartRow is 10:
      // Routes will fill rows 10, 11, 12, 13, 14
      //
      routeTableStartRow: 7,  // ← Change 10 to the row number where your route table starts
      routeTableStartColumn: 1, // Usually 1 (Column A), rarely needs changing
      
      // =========================================
      // ROUTE FIELD COLUMNS
      // =========================================
      // These are COLUMN NUMBERS (1=A, 2=B, 3=C, 4=D, 5=E, 6=F, 7=G, 8=H, 9=I, 10=J, 11=K, etc.)
      // Update these to match which columns in your template contain each field
      //
      // EXAMPLE LAYOUT:
      // Row 10: | FPS | Route # | Start Time | End Time | Driver | Driver TAS | PA | PA TAS | Vehicle | ...
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
      vehiclePlateColumn: 10,           // Column J (10) - Vehicle Plate Number
      passengerCountColumn: 11,        // Column K (11) - Passenger Count
      routeNotesColumn: 12,            // Column L (12) - Route Notes
    },
    
    // Worksheet name
    worksheetName = 'Sheet1', // Update if your sheet has a different name
  } = options;

  try {
    // Load the template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    // Get the first worksheet (or by name if specified)
    const worksheet = workbook.getWorksheet(worksheetName) || workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error('Worksheet not found in template');
    }

    console.log(`📄 Loaded template: ${templatePath}`);
    console.log(`📋 Working with worksheet: ${worksheet.name}`);

    // =========================================
    // FILL ROUTE DATA
    // =========================================
    // HOW MULTIPLE ROWS ARE FILLED:
    // The script loops through each route and fills it in a separate row.
    // Row calculation: rowIndex = routeTableStartRow + routeIndex
    //
    // EXAMPLE with routeTableStartRow = 10:
    // - Route 0 → Row 10 (10 + 0)
    // - Route 1 → Row 11 (10 + 1)
    // - Route 2 → Row 12 (10 + 2)
    // - Route 3 → Row 13 (10 + 3)
    //
    // Each route's data is filled across the columns specified in cellLocations
    if (routes && routes.length > 0) {
      console.log(`\n🚌 Filling ${routes.length} route(s)...`);
      console.log(`   Starting at row ${cellLocations.routeTableStartRow}`);
      
      routes.forEach((route, index) => {
        // Calculate which row this route should be filled in
        // First route (index 0) = routeTableStartRow
        // Second route (index 1) = routeTableStartRow + 1
        // Third route (index 2) = routeTableStartRow + 2
        // And so on...
        const rowIndex = cellLocations.routeTableStartRow + index;
        
        // FPS Number (from school table - same for all routes)
        if (schoolFps) {
          worksheet.getCell(rowIndex, cellLocations.fpsColumn).value = schoolFps;
        }
        
        // Route Number
        if (route.route_number) {
          worksheet.getCell(rowIndex, cellLocations.routeNumberColumn).value = route.route_number;
          console.log(`   ✓ Route ${route.route_number} → Row ${rowIndex}`);
        }
        
        // Start Time (AM)
        if (route.am_start_time) {
          const formattedTime = formatTime(route.am_start_time);
          worksheet.getCell(rowIndex, cellLocations.routeStartTimeColumn).value = formattedTime;
        }
        
        // End Time (PM)
        if (route.pm_start_time) {
          const formattedTime = formatTime(route.pm_start_time);
          worksheet.getCell(rowIndex, cellLocations.routeEndTimeColumn).value = formattedTime;
        }
        
        // Driver Name
        if (route.driver) {
          const driver = Array.isArray(route.driver) ? route.driver[0] : route.driver;
          const driverName = driver?.employees?.full_name || '';
          if (driverName) {
            worksheet.getCell(rowIndex, cellLocations.driverNameColumn).value = driverName;
          }
        }
        
        // Driver TAS Number
        if (route.driver) {
          const driver = Array.isArray(route.driver) ? route.driver[0] : route.driver;
          const driverTas = driver?.tas_badge_number || driver?.taxi_badge_number || '';
          if (driverTas) {
            worksheet.getCell(rowIndex, cellLocations.driverTasColumn).value = driverTas;
          }
        }
        
        // Passenger Assistant Name
        if (route.pa) {
          const pa = Array.isArray(route.pa) ? route.pa[0] : route.pa;
          const paName = pa?.employees?.full_name || '';
          if (paName) {
            worksheet.getCell(rowIndex, cellLocations.paNameColumn).value = paName;
          }
        }
        
        // Passenger Assistant TAS Number
        if (route.pa) {
          const pa = Array.isArray(route.pa) ? route.pa[0] : route.pa;
          const paTas = pa?.tas_badge_number || '';
          if (paTas) {
            worksheet.getCell(rowIndex, cellLocations.paTasColumn).value = paTas;
          }
        }
        
        // Vehicle Registration
        if (route.vehicles) {
          const vehicle = Array.isArray(route.vehicles) ? route.vehicles[0] : route.vehicles;
          const vehicleReg = vehicle?.registration || vehicle?.plate_number || '';
          if (vehicleReg) {
            worksheet.getCell(rowIndex, cellLocations.vehicleRegColumn).value = vehicleReg;
          }
        }
        
        // Vehicle Plate Number
        if (route.vehicles) {
          const vehicle = Array.isArray(route.vehicles) ? route.vehicles[0] : route.vehicles;
          const vehiclePlate = vehicle?.plate_number || vehicle?.registration || '';
          if (vehiclePlate) {
            worksheet.getCell(rowIndex, cellLocations.vehiclePlateColumn).value = vehiclePlate;
          }
        }
        
        // Passenger Count (if passengers array is provided)
        if (route.passengers && Array.isArray(route.passengers)) {
          worksheet.getCell(rowIndex, cellLocations.passengerCountColumn).value = route.passengers.length;
        }
        
        // Route Notes
        if (route.notes) {
          worksheet.getCell(rowIndex, cellLocations.routeNotesColumn).value = route.notes;
        }
      });
    }

    // =========================================
    // 3️⃣ SAVE OUTPUT FILE
    // =========================================
    console.log('\n💾 Saving filled template...');
    await workbook.xlsx.writeFile(outputPath);
    console.log(`✅ Successfully saved: ${outputPath}`);
    
    return {
      success: true,
      outputPath,
      routesCount: routes ? routes.length : 0,
    };

  } catch (error) {
    console.error('❌ Error filling template:', error);
    throw error;
  }
}

// =========================================
// EXAMPLE USAGE
// =========================================
async function main() {
  try {
    const result = await fillTAS5Template({
      // Input/Output
      templatePath: path.join(__dirname, 'TAS 5.xlsx'),
      outputPath: path.join(__dirname, 'TAS5_filled.xlsx'),
      
      // School data
      schoolFps: 'FPS-001', // FPS number from school table
      
      // Route data (example)
      routes: [
        {
          route_number: 'R001',
          am_start_time: '08:00:00',
          pm_start_time: '15:30:00',
          driver: {
            employees: { full_name: 'John Smith' },
            tas_badge_number: 'TAS-DRV-001',
          },
          pa: {
            employees: { full_name: 'Jane Doe' },
            tas_badge_number: 'TAS-PA-001',
          },
          vehicles: {
            registration: 'AB12 CDE',
            plate_number: 'PLATE123',
          },
          passengers: [
            { full_name: 'Alice Johnson' },
            { full_name: 'Bob Williams' },
          ],
          notes: 'Morning route only',
        },
        {
          route_number: 'R002',
          am_start_time: '08:15:00',
          pm_start_time: '15:45:00',
          driver: {
            employees: { full_name: 'Mike Johnson' },
            tas_badge_number: 'TAS-DRV-002',
          },
          pa: {
            employees: { full_name: 'Sarah Wilson' },
            tas_badge_number: 'TAS-PA-002',
          },
          vehicles: {
            registration: 'XY98 ZAB',
            plate_number: 'PLATE456',
          },
          passengers: [
            { full_name: 'Charlie Brown' },
            { full_name: 'Diana Smith' },
            { full_name: 'Ethan Davis' },
          ],
        },
      ],
      
      // Cell locations - ADJUST THESE TO MATCH YOUR TEMPLATE
      cellLocations: {
        // Route table structure
        routeTableStartRow: 7, // Row where first route data goes
        routeTableStartColumn: 1, // Column A
        
        // Route field columns (adjust based on your template layout)
        fpsColumn: 1, // Column A - FPS Number (from school table)
        routeNumberColumn: 2, // Column B - Route Number
        routeStartTimeColumn: 3, // Column C - Start Time
        routeEndTimeColumn: 4, // Column D - End Time
        driverNameColumn: 5, // Column E - Driver Name
        driverTasColumn: 6, // Column F - Driver TAS
        paNameColumn: 7, // Column G - PA Name
        paTasColumn: 8, // Column H - PA TAS
        vehicleRegColumn: 9, // Column I - Vehicle Registration
        vehiclePlateColumn: 10, // Column J - Vehicle Plate
        passengerCountColumn: 11, // Column K - Passenger Count
        routeNotesColumn: 12, // Column L - Route Notes
      },
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Routes filled: ${result.routesCount}`);
    
  } catch (error) {
    console.error('Failed to fill template:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = { fillTAS5Template, formatTime, formatDate };
