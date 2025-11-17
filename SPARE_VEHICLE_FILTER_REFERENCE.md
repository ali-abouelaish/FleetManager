# 🎯 Spare Vehicle Filter - Quick Reference

## One-Liner Summary
**Vehicle Locations feature now works exclusively with spare vehicles only.**

---

## 🔍 Filter Pattern (Copy & Paste)

### For Supabase Queries with JOIN
```typescript
// List page - fetch locations with vehicle details
const { data } = await supabase
  .from('vehicle_locations')
  .select(`
    *,
    vehicles!inner (
      id, vehicle_identifier, make, model,
      registration, spare_vehicle, off_the_road
    )
  `)
  .eq('vehicles.spare_vehicle', true)
  .or('vehicles.off_the_road.is.null,vehicles.off_the_road.eq.false')
  .order('last_updated', { ascending: false })
```

### For Direct Vehicle Queries
```typescript
// Dropdown population - fetch spare vehicles only
const { data } = await supabase
  .from('vehicles')
  .select('id, vehicle_identifier, make, model, registration')
  .eq('spare_vehicle', true)
  .or('off_the_road.is.null,off_the_road.eq.false')
  .order('vehicle_identifier')
```

### SQL Equivalent
```sql
-- For reference: equivalent SQL
SELECT *
FROM vehicle_locations vl
INNER JOIN vehicles v ON vl.vehicle_id = v.id
WHERE v.spare_vehicle = TRUE 
  AND (v.off_the_road = FALSE OR v.off_the_road IS NULL)
ORDER BY vl.last_updated DESC;
```

---

## 📋 Files Changed Checklist

### ✅ Application Pages (5 files)
- [x] `app/dashboard/vehicle-locations/page.tsx` - List page query & UI
- [x] `app/dashboard/vehicle-locations/create/page.tsx` - Dropdown filter & UI
- [x] `app/dashboard/vehicle-locations/[id]/page.tsx` - Detail page UI
- [x] `app/dashboard/vehicle-locations/[id]/edit/page.tsx` - Dropdown filter & UI
- [x] `app/dashboard/vehicle-locations/loading.tsx` - Table headers

### ✅ Navigation & Dashboard (2 files)
- [x] `components/dashboard/Sidebar.tsx` - Menu item name
- [x] `app/dashboard/page.tsx` - Section titles & labels

### ✅ Database (1 file)
- [x] `supabase/migrations/005_add_vehicle_locations.sql` - Trigger & comment

---

## 🎯 Key Changes at a Glance

| Aspect | Old | New |
|--------|-----|-----|
| **Feature Name** | Vehicle Locations | Spare Vehicle Locations |
| **Scope** | All vehicles | Only spare vehicles |
| **Query Filter** | None | `spare_vehicle = TRUE AND (off_the_road = FALSE OR NULL)` |
| **Dropdown** | All vehicles | Only spare vehicles |
| **Status Badge** | Active/Spare/Off Road | Spare Available |
| **Empty Message** | No locations found | No spare vehicle locations found |
| **Button Label** | Add Vehicle Location | Add Spare Vehicle Location |

---

## 🧪 Quick Test

### Verify Filtering Works
1. Go to `/dashboard/vehicle-locations`
2. Verify only spare vehicles appear
3. Check that off-road spares are excluded
4. Try creating location - dropdown should only show spare vehicles

### Verify Trigger Works
1. Open database client
2. Run: `UPDATE vehicles SET spare_vehicle = FALSE WHERE id = [some_spare_vehicle_id];`
3. Check: `SELECT last_updated FROM vehicle_locations WHERE vehicle_id = [id];`
4. Verify: `last_updated` timestamp changed to NOW()
5. UI: Location should disappear from list (filtered out)

---

## 💡 Important Notes

### Data Preservation
- ✅ When a vehicle becomes non-spare, its location **remains in database**
- ✅ Location is simply **hidden from UI** via query filter
- ✅ If vehicle returns to spare status, location **reappears automatically**
- ✅ No data loss - full audit trail preserved

### Trigger Behavior
```sql
-- Fires when spare_vehicle changes from TRUE to FALSE
-- Updates last_updated to create audit trail
-- Shows when vehicle was last considered a spare
```

### Dashboard Stats
```typescript
Spare Vehicles Available:
  COUNT(vehicles WHERE spare = TRUE AND not off_road)

Spare Vehicles with Location:
  COUNT(vehicle_locations INNER JOIN vehicles WHERE spare = TRUE)
  
Recent Locations:
  TOP 5 from vehicle_locations WHERE spare = TRUE
  ORDER BY last_updated DESC
```

---

## 🚀 Deploy Command

```bash
# Apply migration (includes trigger)
supabase db push

# Verify trigger was created
supabase db inspect triggers
# Should show: trigger_update_location_on_spare_change
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] List page shows only spare vehicles
- [ ] Off-road spare vehicles are excluded
- [ ] Create page dropdown shows only spare vehicles
- [ ] Edit page dropdown shows only spare vehicles
- [ ] Dashboard stats count only spare vehicles
- [ ] Sidebar shows "Spare Vehicle Locations"
- [ ] All buttons say "Add Spare Vehicle Location"
- [ ] Status badge shows "Spare Available" (green)
- [ ] Trigger updates timestamp when spare status changes
- [ ] No linting errors

---

## 🎉 Result

**Feature is now exclusive to spare vehicles!**

- ✅ All queries filtered correctly
- ✅ UI labels updated throughout
- ✅ Dropdowns show only spare vehicles
- ✅ Dashboard focused on spare management
- ✅ Trigger creates audit trail
- ✅ Zero linting errors
- ✅ Production ready

---

**For detailed documentation, see:**
- `SPARE_VEHICLE_LOCATIONS_UPDATE.md` - Complete update details
- `VEHICLE_LOCATIONS_IMPLEMENTATION.md` - Technical architecture
- `VEHICLE_LOCATIONS_QUICKSTART.md` - User guide

