# 🗺️ Google Maps Integration - Setup Guide

## 🎯 Overview

Added Google Maps integration to the Schools page to visualize all school locations on an interactive map.

---

## 📦 Installation

### Step 1: Install Google Maps Package

```bash
npm install @googlemaps/js-api-loader
```

Or with yarn:
```bash
yarn add @googlemaps/js-api-loader
```

---

## 🔑 Step 2: Get Google Maps API Key

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Create a New Project (or select existing)
- Click "Select a project" → "New Project"
- Name it (e.g., "Fleet Management")
- Click "Create"

### 3. Enable Required APIs
- Go to "APIs & Services" → "Library"
- Search for and enable these APIs:
  - ✅ **Maps JavaScript API**
  - ✅ **Geocoding API**
  - ✅ **Places API** (optional, for enhanced features)

### 4. Create API Key
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "API Key"
- Copy the API key

### 5. Restrict API Key (Recommended)
- Click on the API key you just created
- Under "Application restrictions":
  - Select "HTTP referrers (web sites)"
  - Add your domain:
    - `http://localhost:3000/*` (for development)
    - `https://yourdomain.com/*` (for production)
- Under "API restrictions":
  - Select "Restrict key"
  - Choose: Maps JavaScript API, Geocoding API, Places API
- Click "Save"

---

## 🔧 Step 3: Add API Key to Environment

### Create or update `.env.local` file:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**⚠️ Important:** 
- The variable MUST start with `NEXT_PUBLIC_` to be accessible in the browser
- Replace `your_api_key_here` with your actual API key
- Restart your Next.js dev server after adding the key

### Example:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuv
```

---

## 🗄️ Step 4: Database Schema (Optional Enhancement)

To improve performance, you can add latitude/longitude columns to the schools table:

```sql
-- Add coordinates columns to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for geo queries
CREATE INDEX IF NOT EXISTS idx_schools_coordinates 
ON schools(latitude, longitude);

-- Add comment
COMMENT ON COLUMN schools.latitude IS 'Latitude coordinate for map display';
COMMENT ON COLUMN schools.longitude IS 'Longitude coordinate for map display';
```

**Benefits of storing coordinates:**
- ✅ Faster map loading (no real-time geocoding needed)
- ✅ Reduced API calls to Google Geocoding API
- ✅ Consistent positioning

**Note:** If coordinates are not stored, the map will automatically geocode addresses using the Geocoding API (this happens client-side).

---

## 🎨 Features

### Map Display:
- 📍 **All schools plotted as markers** using their addresses
- 🔍 **Auto-zoom** to fit all school locations
- 📌 **Clickable markers** with school information
- 🎯 **Info windows** showing:
  - School name
  - Full address & postcode
  - Contact number
  - Link to view school details

### Geocoding:
- Automatic address-to-coordinates conversion
- Fallback to stored coordinates if available
- Error handling for invalid addresses

### Map Controls:
- ✅ Map type control (Map/Satellite)
- ✅ Zoom controls
- ✅ Fullscreen mode
- ❌ Street view (disabled for cleaner UI)

---

## 📂 Files Created/Modified

### New Files:
1. **`components/maps/SchoolsMap.tsx`**
   - Client-side Google Maps component
   - Handles map initialization and marker creation
   - Automatic geocoding of school addresses
   - Info window popups

2. **`GOOGLE_MAPS_SETUP.md`**
   - This setup guide

### Modified Files:
1. **`app/dashboard/schools/page.tsx`**
   - Added map view card above schools list
   - Integrated SchoolsMap component
   - Added API key check and warning

---

## 🖥️ UI Layout

### Schools Page Structure:

```
┌─────────────────────────────────────┐
│  Schools                    [Add +] │
├─────────────────────────────────────┤
│  🗺️ Schools Map View               │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │     [Interactive Map]         │ │
│  │      with school markers      │ │
│  │                               │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  📋 Schools List                    │
│  ┌───────────────────────────────┐ │
│  │ Table with all schools        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### 1. Without API Key:
- Should show yellow warning: "Google Maps API Key Required"

### 2. With Valid API Key:
- Map loads with all schools
- Clicking a marker shows info window
- "View Details" link works

### 3. With Invalid Address:
- School with invalid address is skipped
- Console shows error message
- Other schools still display correctly

---

## 💰 Google Maps API Pricing

### Free Tier:
- **$200 monthly credit** (covers ~28,000 map loads)
- **Maps JavaScript API:** $7 per 1,000 loads
- **Geocoding API:** $5 per 1,000 requests

### Cost Optimization:
1. **Store coordinates** in database to avoid repeated geocoding
2. **Restrict API key** to your domain only
3. **Enable billing alerts** in Google Cloud Console
4. Most small-to-medium applications stay within free tier

---

## 🚀 Next Steps (Optional Enhancements)

### 1. Add Coordinates to Database:
```sql
-- Run the ALTER TABLE command from Step 4
```

### 2. Store Coordinates When Creating/Editing Schools:
- Geocode address on form submission
- Save lat/lng to database
- Speeds up future map loads

### 3. Add Route Visualization:
- Draw lines between schools and depot
- Show route assignments on map
- Color-code by route

### 4. Add Clustering:
- Group nearby schools when zoomed out
- Improves performance with many schools

### 5. Add Search/Filter:
- Search schools on map
- Filter by region/postcode
- Highlight selected school

---

## 🐛 Troubleshooting

### Map Not Loading:
```bash
# Check console for errors
# Common issues:
1. API key not set in .env.local
2. API key has wrong restrictions
3. Maps JavaScript API not enabled
4. Forgot to restart dev server after adding key
```

### "This page can't load Google Maps correctly":
```bash
# This usually means:
1. Invalid API key
2. Billing not enabled on Google Cloud project
3. API restrictions too strict (HTTP referrers)
```

### Markers Not Appearing:
```bash
# Check:
1. Schools have valid addresses
2. Console for geocoding errors
3. Geocoding API is enabled
```

---

## ✅ Setup Checklist

- [ ] Install `@googlemaps/js-api-loader` package
- [ ] Create Google Cloud project
- [ ] Enable Maps JavaScript API
- [ ] Enable Geocoding API
- [ ] Create API key
- [ ] Restrict API key (optional but recommended)
- [ ] Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`
- [ ] Restart Next.js dev server
- [ ] Navigate to `/dashboard/schools`
- [ ] Verify map loads with school markers
- [ ] Test clicking markers to see info windows

---

## 📚 Documentation Links

- **Google Maps JavaScript API:** https://developers.google.com/maps/documentation/javascript
- **Geocoding API:** https://developers.google.com/maps/documentation/geocoding
- **@googlemaps/js-api-loader:** https://github.com/googlemaps/js-api-loader

---

**🎉 Setup Complete!**

Your schools page now has an interactive map view showing all school locations! 🗺️

