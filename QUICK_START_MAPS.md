# 🗺️ Google Maps - Quick Start

## 3 Steps to Enable Maps

### Step 1: Get API Key
1. Visit https://console.cloud.google.com/
2. Create project → Enable "Maps JavaScript API" & "Geocoding API"
3. Create API key → Copy it

### Step 2: Add to .env.local
Create/edit `.env.local` in project root:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```

### Step 3: Restart Server
```bash
npm run dev
```

**Done!** Visit `/dashboard/schools` to see the map 🗺️

---

## What You Get

✅ Interactive map showing all schools  
✅ Clickable markers with school info  
✅ Auto-zoom to fit all schools  
✅ "View Details" button in popups  
✅ Navy-themed UI matching dashboard  

---

## Optional: Add Coordinates Storage

For faster loading and fewer API calls:

```bash
# Run migration to add lat/lng columns
npx supabase migration up 008_add_school_coordinates
```

Then update your school forms to geocode and save coordinates when creating/editing schools.

---

## Need Help?

- **Full setup guide:** `GOOGLE_MAPS_SETUP.md`
- **Integration details:** `GOOGLE_MAPS_INTEGRATION_SUMMARY.md`
- **Troubleshooting:** Check browser console for errors

---

**🎉 That's it! Enjoy your interactive school map!**

