# 🔧 Environment Setup Instructions

## Current Issue
You're seeing: "Failed to load map. Please check your Google Maps API key."

## Solution

### 1. Open or Create `.env.local` File

**Location:** `D:\Fleet\.env.local` (in your project root)

**If the file doesn't exist, create it. If it exists, add this line:**

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### 2. Get Your Google Maps API Key

#### Quick Steps:
1. **Go to:** https://console.cloud.google.com/
2. **Create a project** (or select existing one)
3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable: **"Maps JavaScript API"**
   - Search and enable: **"Geocoding API"**
4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the key!

#### Your API key will look like:
```
AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Add to `.env.local`

Open `D:\Fleet\.env.local` in any text editor and add:

```bash
# Supabase (your existing config)
NEXT_PUBLIC_SUPABASE_URL=your_existing_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_existing_supabase_key

# Google Maps (ADD THIS LINE)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Replace** `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual API key.

### 4. Restart Dev Server

**Stop your current server:**
- Press `Ctrl+C` in the terminal

**Start it again:**
```bash
npm run dev
```

### 5. Test

Go to: http://localhost:3000/dashboard/schools

You should now see the map! 🗺️

---

## ✅ Checklist

- [ ] Went to Google Cloud Console
- [ ] Created project (or selected existing)
- [ ] Enabled "Maps JavaScript API"
- [ ] Enabled "Geocoding API"
- [ ] Created API key
- [ ] Copied the API key
- [ ] Opened `.env.local` file in text editor
- [ ] Added `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`
- [ ] Saved the file
- [ ] Restarted dev server (Ctrl+C then npm run dev)
- [ ] Refreshed /dashboard/schools page
- [ ] Map is now working! 🎉

---

## 🐛 Troubleshooting

### Map still not loading?

1. **Check file name:** Must be `.env.local` (not `.env` or `env.local`)
2. **Check variable name:** Must be exactly `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. **No spaces:** No spaces around the `=` sign
4. **No quotes:** Don't wrap the key in quotes
5. **Restart required:** Must restart dev server after adding

### Example of correct format:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB1234567890abcdefghijklmnop
```

### Example of WRONG formats:
```bash
❌ GOOGLE_MAPS_API_KEY=...              (missing NEXT_PUBLIC_)
❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = ... (spaces around =)
❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..." (quotes)
```

---

## 💡 Need Help?

If you're stuck, share:
1. The first few characters of your API key (e.g., "AIzaSy...")
2. Screenshot of your Google Cloud Console "Credentials" page
3. Any error messages in the browser console (F12)

---

## 💰 Cost Info

**Don't worry!** Google gives you:
- **$200 FREE credit every month**
- That's enough for **28,000+ map loads**
- You'll stay within free tier for development

---

**Once you add the API key and restart, the map will work immediately!** 🗺️✨

