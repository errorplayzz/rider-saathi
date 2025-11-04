# Complete Deployment Guide - Rider Saathi on Supabase

This guide covers deploying your Supabase-powered Rider Saathi application to production.

## 🎯 Prerequisites

- Supabase account (https://supabase.com)
- GitHub account
- Vercel account (https://vercel.com)
- Your project code in a GitHub repository

---

## Part 1: Supabase Production Setup

### Step 1: Create Production Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in details:
   - **Name:** rider-saathi-prod
   - **Database Password:** Strong password (save securely!)
   - **Region:** Choose closest to your primary users
   - **Plan:** Free or Pro depending on needs
4. Wait for provisioning (2-3 minutes)

### Step 2: Enable Required Extensions

1. Go to **Database → Extensions**
2. Enable:
   - `postgis` - For location features
   - `pg_trgm` - For text search
   - `uuid-ossp` - For UUID generation

### Step 3: Create Database Schema

1. Go to **SQL Editor**
2. Click "New Query"
3. Copy the entire `supabase/schema.sql` file contents
4. Click "Run" to execute
5. Verify success by checking **Table Editor**

### Step 4: Configure Storage Buckets

#### Create `avatars` bucket:
1. Go to **Storage**
2. Click "Create a new bucket"
3. Settings:
   - **Name:** avatars
   - **Public bucket:** Yes (toggle on)
   - Click "Save"

4. Configure policies:
   - Go to bucket → Policies
   - Add policy:
     ```sql
     CREATE POLICY "Public avatars are viewable by everyone"
     ON storage.objects FOR SELECT
     USING (bucket_id = 'avatars');
     
     CREATE POLICY "Users can upload their own avatar"
     ON storage.objects FOR INSERT
     WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```

#### Create `chat-media` bucket:
1. Click "Create a new bucket"
2. Settings:
   - **Name:** chat-media
   - **Public bucket:** No (keep private)
   - Click "Save"

3. Configure policies:
   ```sql
   CREATE POLICY "Users can upload chat media"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
   
   CREATE POLICY "Users can view chat media from their rooms"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
   ```

### Step 5: Enable Realtime

1. Go to **Database → Replication**
2. Enable replication for these tables:
   - ✅ messages
   - ✅ emergency_alerts
   - ✅ profiles
   - ✅ locations
3. Click "Enable" for each table

### Step 6: Configure Authentication

1. Go to **Authentication → Providers**
2. **Email Provider:**
   - Already enabled by default
   - Configure email templates if needed

3. **Optional - Enable OAuth:**
   
   **Google OAuth:**
   - Enable Google provider
   - Get OAuth credentials from Google Cloud Console
   - Add Client ID and Secret
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   
   **GitHub OAuth:**
   - Enable GitHub provider
   - Get OAuth app from GitHub Settings
   - Add Client ID and Secret
   - Add redirect URL

4. **URL Configuration:**
   - Go to **Authentication → URL Configuration**
   - **Site URL:** `https://rider-saathi.vercel.app` (your Vercel URL)
   - **Redirect URLs:** Add:
     - `https://rider-saathi.vercel.app/**`
     - `https://*.vercel.app/**` (for preview deployments)

### Step 7: Get API Keys

1. Go to **Settings → API**
2. Copy and save:
   - ✅ Project URL (e.g., `https://xxxxx.supabase.co`)
   - ✅ `anon` public key (safe for frontend)
   - ⚠️ `service_role` key (NEVER expose publicly)

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Your Repository

1. Ensure your code is pushed to GitHub:
```powershell
git add .
git commit -m "Complete Supabase migration"
git push origin main
```

2. Verify `frontend/package.json` has correct dependencies:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    // ... other dependencies (NO axios or socket.io-client)
  }
}
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 3: Add Environment Variables

In Vercel project settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_APP_ENV=production
```

⚠️ **Important:** Use the `anon` key, NOT the `service_role` key!

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Once deployed, you'll get a URL like: `https://rider-saathi.vercel.app`

### Step 5: Update Supabase with Vercel URL

1. Go back to **Supabase → Authentication → URL Configuration**
2. Update **Site URL** to your Vercel URL
3. Add Vercel URL to **Redirect URLs**
4. Save changes

---

## Part 3: Post-Deployment Configuration

### Step 1: Test Core Features

Test the following in production:

✅ **Authentication:**
- [ ] Register new account
- [ ] Login with existing account
- [ ] Forgot password flow
- [ ] Profile loading

✅ **Realtime:**
- [ ] Send chat message
- [ ] Receive realtime messages
- [ ] Online/offline presence
- [ ] Emergency alerts

✅ **Storage:**
- [ ] Upload avatar
- [ ] Upload chat media
- [ ] View uploaded files

✅ **Location:**
- [ ] Update location
- [ ] View nearby users
- [ ] Map features

### Step 2: Set Up Custom Domain (Optional)

1. In Vercel:
   - Go to Project Settings → Domains
   - Add your custom domain (e.g., `app.ridersathi.com`)
   - Follow DNS configuration steps

2. In Supabase:
   - Update Site URL to your custom domain
   - Add domain to Redirect URLs

### Step 3: Configure Email Templates

1. Go to **Supabase → Authentication → Email Templates**
2. Customize templates for:
   - Confirm signup
   - Magic Link
   - Change Email
   - Reset Password

### Step 4: Enable Database Backups

1. Go to **Database → Backups**
2. Configure automated backups:
   - Daily backups (free plan)
   - Point-in-time recovery (Pro plan)

---

## Part 4: Performance Optimization

### Enable Edge Caching

In `vercel.json` (create in frontend folder):
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Database Indexes

Verify these indexes exist (should be created by schema.sql):
```sql
-- Check existing indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Optimize Queries

Use Supabase Query Performance:
1. Go to **Database → Query Performance**
2. Identify slow queries
3. Add indexes as needed

---

## Part 5: Monitoring & Maintenance

### Set Up Monitoring

1. **Vercel Analytics:**
   - Enable in Project Settings
   - Track page views and performance

2. **Supabase Logs:**
   - Go to **Logs** to view:
     - API logs
     - Postgres logs
     - Realtime logs

3. **Error Tracking (Optional):**
   - Integrate Sentry for error tracking
   - Add to `frontend/.env`:
     ```env
     VITE_SENTRY_DSN=your-sentry-dsn
     ```

### Database Maintenance

1. **Regular Vacuum:**
```sql
-- Run weekly
VACUUM ANALYZE;
```

2. **Check Database Size:**
```sql
SELECT 
  pg_size_pretty(pg_database_size('postgres')) as database_size;
```

3. **Monitor Table Sizes:**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Part 6: Security Best Practices

### Row Level Security (RLS)

Verify RLS is enabled on all tables:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All should show `true` for `rowsecurity`.

### API Key Security

- ✅ Use `anon` key in frontend
- ❌ NEVER expose `service_role` key
- ✅ Rotate keys if compromised (Supabase Settings → API)

### HTTPS Only

Vercel automatically provides HTTPS. Ensure:
1. All requests use HTTPS
2. No mixed content warnings
3. HSTS header enabled

### Rate Limiting

Supabase has built-in rate limiting:
- Anonymous: 100 requests per hour
- Authenticated: Higher limits

For custom limits, implement in your app logic.

---

## Part 7: Scaling Considerations

### Database Scaling

**Free Tier Limits:**
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users

**When to Upgrade:**
- Database > 400 MB
- Need more concurrent connections
- Require point-in-time recovery
- Need better performance

### Frontend Scaling

Vercel automatically scales:
- Global CDN
- Serverless functions
- No configuration needed

### Realtime Scaling

**Free Tier:** 200 concurrent connections

**If you need more:**
- Upgrade Supabase plan
- Implement connection pooling
- Use broadcast for one-way messages

---

## Part 8: Troubleshooting

### Common Issues

#### Issue: "Failed to fetch" errors
**Solution:**
- Check CORS settings in Supabase
- Verify API keys are correct
- Check network tab in browser DevTools

#### Issue: RLS Policy Violations
**Solution:**
- Review policies in Supabase Dashboard
- Check user authentication status
- Use `auth.uid()` in policies

#### Issue: Realtime not working
**Solution:**
- Verify Realtime is enabled for tables
- Check subscription in browser console
- Ensure user is authenticated

#### Issue: File upload fails
**Solution:**
- Verify bucket exists and is configured
- Check storage policies
- Ensure file size is within limits

### Debug Mode

Enable debug logging:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
})
```

---

## Part 9: Backup & Disaster Recovery

### Automated Backups

Supabase provides:
- **Free:** Daily backups (7-day retention)
- **Pro:** Daily + point-in-time recovery

### Manual Backup

```bash
# Using pg_dump (if you have direct access)
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Restore from Backup

1. Go to **Database → Backups**
2. Select backup
3. Click "Restore"
4. Confirm (this will overwrite current database)

---

## Part 10: Cost Estimation

### Supabase Free Tier
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50,000 MAU
- ✅ 2 million Realtime messages
- ✅ Free SSL

### Supabase Pro ($25/month)
- 8 GB database
- 100 GB file storage
- 100,000 MAU
- 5 million Realtime messages
- Daily backups with PITR

### Vercel
- ✅ Free for hobby projects
- ✅ 100 GB bandwidth
- ✅ Unlimited websites

**Estimated Monthly Cost for Small App:**
- Supabase Free: $0
- Vercel: $0
- **Total: $0** 🎉

---

## ✅ Deployment Checklist

Before going live:

- [ ] Database schema created
- [ ] Storage buckets configured
- [ ] Realtime enabled for required tables
- [ ] RLS policies verified
- [ ] Environment variables set in Vercel
- [ ] Supabase URL configuration updated
- [ ] All features tested in production
- [ ] Email templates customized
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] SSL working (HTTPS)
- [ ] Custom domain configured (if applicable)
- [ ] Error tracking enabled
- [ ] Performance optimized

---

## 🎉 You're Live!

Your Rider Saathi app is now running entirely on Supabase infrastructure:
- ✅ No backend server to maintain
- ✅ Auto-scaling
- ✅ Built-in authentication
- ✅ Realtime capabilities
- ✅ Global CDN for files
- ✅ Database backups
- ✅ Production-ready

**Access your app:** https://rider-saathi.vercel.app

---

## 📞 Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**Last Updated:** November 2025
**Version:** 1.0 (Supabase Migration)
