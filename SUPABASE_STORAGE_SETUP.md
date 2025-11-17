# 📦 Supabase Storage Setup for Driver Documents

## Required for: Add Driver Form File Uploads

---

## 🎯 Quick Setup

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard**
2. Navigate to **Storage** in left sidebar
3. Click **"New bucket"**
4. Settings:
   - **Name:** `driver-documents`
   - **Public bucket:** Yes (or configure RLS policies)
   - **File size limit:** 50MB (default)
   - **Allowed MIME types:** Leave empty (all types allowed)
5. Click **"Create bucket"**

---

## 🔐 Security Options

### Option A: Public Bucket (Simpler)
```sql
-- Bucket is public
-- Anyone with URL can view
-- Good for: Internal systems, non-sensitive documents
```

**Pros:**
- ✅ Easier setup
- ✅ No RLS policies needed
- ✅ Direct URL access

**Cons:**
- ⚠️ Anyone with URL can view files
- ⚠️ URLs can be shared

### Option B: Private Bucket with RLS (Recommended)
```sql
-- Only authenticated users can access
-- Enforces row-level security
-- Good for: Sensitive documents, production systems
```

**RLS Policies:**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-documents');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'driver-documents');

-- Allow authenticated users to delete (optional)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-documents');
```

---

## 📁 Folder Structure

The form automatically creates this structure:

```
driver-documents/
├── {employee_id_1}/
│   ├── tas_badge_file_1700000001234.pdf
│   ├── dbs_file_1700000005678.pdf
│   └── photo_file_1700000009012.jpg
├── {employee_id_2}/
│   ├── taxi_badge_file_1700000011111.pdf
│   └── driving_license_file_1700000022222.pdf
└── ...
```

**Benefits:**
- ✅ Organized by employee
- ✅ Easy to find documents
- ✅ Prevents naming conflicts
- ✅ Timestamps prevent overwrites

---

## 🎨 File Types Accepted

### Currently Configured:
- **PDF** (`.pdf`) - Certificates, documents
- **JPEG** (`.jpg`, `.jpeg`) - Photos, scans
- **PNG** (`.png`) - Screenshots, scans

### To Add More Types:

In the form code, update `accept` attribute:
```typescript
accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
```

---

## 📊 Storage Limits

### Supabase Free Tier:
- **Storage:** 1 GB
- **Bandwidth:** 2 GB/month
- **File size:** 50 MB per file

### Supabase Pro Tier:
- **Storage:** 8 GB (+ $0.021/GB)
- **Bandwidth:** 50 GB/month
- **File size:** 50 MB per file

### Estimate Usage:

**Per Driver:**
- 10 certificates × 500 KB avg = 5 MB
- 1 photo × 2 MB = 2 MB
- **Total: ~7 MB per driver**

**Capacity:**
- Free tier: ~140 drivers
- Pro tier: ~1,140 drivers

---

## 🔧 Testing the Setup

### 1. Test Upload (Manual)

In Supabase Dashboard:
1. Go to **Storage** → **driver-documents**
2. Click **"Upload file"**
3. Create folder: `test`
4. Upload a test file
5. Verify it appears in the bucket

### 2. Test from Application

1. Go to `/dashboard/drivers/create`
2. Fill in basic info
3. Upload a test file in Certificates tab
4. Submit the form
5. Check Supabase Storage for the uploaded file

### 3. Verify Public URL

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('driver-documents')
  .getPublicUrl('test/test-file.pdf')

console.log(publicUrl)
// Should return: https://your-project.supabase.co/storage/v1/object/public/driver-documents/test/test-file.pdf
```

---

## 🐛 Troubleshooting

### "Failed to upload file"

**Check:**
1. ✅ Bucket exists and named correctly
2. ✅ Bucket is public OR RLS policies configured
3. ✅ User is authenticated
4. ✅ File size < 50 MB
5. ✅ Browser console for errors

### "Cannot read file URL"

**Check:**
1. ✅ Bucket is public (if using public URLs)
2. ✅ File was uploaded successfully
3. ✅ Path is correct
4. ✅ RLS policies allow SELECT (if using private bucket)

### "Bucket not found"

**Fix:**
```typescript
// Ensure bucket name matches exactly
.from('driver-documents') // ✅ Correct
.from('driver_documents') // ❌ Wrong
.from('Driver-Documents') // ❌ Case sensitive
```

---

## 📝 Code Reference

### Upload File
```typescript
const { data, error } = await supabase.storage
  .from('driver-documents')
  .upload(fileName, file)
```

### Get Public URL
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('driver-documents')
  .getPublicUrl(fileName)
```

### Delete File
```typescript
const { error } = await supabase.storage
  .from('driver-documents')
  .remove([fileName])
```

### List Files
```typescript
const { data, error } = await supabase.storage
  .from('driver-documents')
  .list('employee_id_folder')
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Create `driver-documents` bucket
- [ ] Configure RLS policies (if private)
- [ ] Set appropriate file size limits
- [ ] Test upload from form
- [ ] Test file retrieval
- [ ] Verify URL access
- [ ] Set up backup strategy
- [ ] Monitor storage usage
- [ ] Configure CDN (optional, for performance)
- [ ] Set up file retention policy (optional)

---

## 🔄 Backup Strategy

### Option 1: Supabase Backup
- Included in Pro plan
- Daily automated backups
- Point-in-time recovery

### Option 2: External Backup
```typescript
// Download all files periodically
const { data: files } = await supabase.storage
  .from('driver-documents')
  .list()

// Download each file
for (const file of files) {
  const { data } = await supabase.storage
    .from('driver-documents')
    .download(file.name)
  
  // Save to external backup
}
```

---

## 📚 Additional Resources

- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage
- **RLS Policies:** https://supabase.com/docs/guides/storage/security/access-control
- **File Uploads:** https://supabase.com/docs/guides/storage/uploads

---

## ✅ Status

Once setup is complete:

✅ Storage bucket created  
✅ Security configured  
✅ Form can upload files  
✅ Files accessible via URL  
✅ Organized folder structure  

**The Add Driver form is now fully functional with file upload support!** 🎉

---

**Setup Time:** ~5 minutes  
**Complexity:** Low  
**Priority:** Required for full form functionality

