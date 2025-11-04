# Supabase Setup Guide for Rider Saathi

This guide will walk you through setting up your Rider Saathi application with Supabase as the backend.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (sign up at https://supabase.com)
- Git installed

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the details:
   - **Project Name**: rider-saathi
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get API Keys

1. In your Supabase project dashboard, click "Settings" (gear icon)
2. Click "API" in the left sidebar
3. Copy and save these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (safe to use in frontend)
   - **service_role** key (NEVER expose in frontend, only for server-side scripts)

## Step 3: Enable Required Extensions

1. Go to "Database" → "Extensions" in your Supabase dashboard
2. Enable the following extensions:
   - **postgis** - For geospatial queries (location features)
   - **pg_trgm** - For better text search
   - **uuid-ossp** - For UUID generation

## Step 4: Create Database Schema

1. Go to "SQL Editor" in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` (see below)
4. Click "Run" to execute the schema
5. Verify tables are created by going to "Table Editor"

## Step 5: Configure Storage Buckets

1. Go to "Storage" in your Supabase dashboard
2. Click "Create a new bucket"
3. Create the following buckets:

### Bucket: `avatars`
- **Name**: avatars
- **Public**: Yes (images need to be publicly accessible)
- **File size limit**: 5 MB
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

### Bucket: `chat-media`
- **Name**: chat-media
- **Public**: No (we'll use signed URLs for security)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/*, video/*, audio/*

## Step 6: Configure Row Level Security (RLS)

RLS policies are included in the schema.sql file, but you can verify them:

1. Go to "Authentication" → "Policies" in your Supabase dashboard
2. Verify policies exist for:
   - profiles (users can read all, update own)
   - messages (users can read/insert if they're in the room)
   - rooms (users can read rooms they're part of)
   - emergency_alerts (anyone can read active alerts)

## Step 7: Enable Realtime

1. Go to "Database" → "Replication" in your Supabase dashboard
2. Enable replication for the following tables:
   - **messages** - For chat realtime
   - **emergency_alerts** - For emergency notifications
   - **profiles** - For online/offline presence
   - **locations** - For live location tracking

3. Click the toggle to enable Realtime for each table

## Step 8: Configure Authentication

1. Go to "Authentication" → "Providers" in your Supabase dashboard
2. Enable **Email** provider (already enabled by default)
3. Optional: Enable **Google** and **GitHub** OAuth:
   - Click on each provider
   - Fill in OAuth credentials from Google/GitHub developer consoles
   - Add redirect URLs

4. Go to "Authentication" → "URL Configuration":
   - **Site URL**: `http://localhost:5173` (for development)
   - **Redirect URLs**: Add:
     - `http://localhost:5173/**`
     - `https://yourdomain.com/**` (for production)

## Step 9: Set Up Environment Variables

Create a `.env` file in your `frontend/` directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For development
VITE_APP_ENV=development
```

**Important**: Never commit the `.env` file to version control. It's already in `.gitignore`.

## Step 10: Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Install Supabase client
npm install @supabase/supabase-js

# Remove old dependencies (if you haven't already)
npm uninstall socket.io-client axios
```

## Step 11: Run the Application

```bash
# From frontend directory
npm run dev
```

The app should now be running at `http://localhost:5173`

## Step 12: Test the Application

1. **Register a new account**
   - Go to http://localhost:5173/register
   - Fill in the form and submit
   - Check your email for verification (if email is configured)

2. **Login**
   - Go to http://localhost:5173/login
   - Use the credentials you just registered

3. **Test features**:
   - Upload avatar (Profile page)
   - Send chat messages (Chat page)
   - Create emergency alert (Emergency page)
   - Track location (Map page)

## Step 13: Deploy to Production

### Deploy Frontend to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com and sign in
3. Click "Import Project"
4. Select your repository
5. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: frontend
   - **Build Command**: `npm run build`
   - **Output Directory**: dist
6. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click "Deploy"

### Update Supabase Settings

1. Go to your Supabase project → "Authentication" → "URL Configuration"
2. Update **Site URL** to your Vercel domain (e.g., `https://rider-saathi.vercel.app`)
3. Add your Vercel domain to **Redirect URLs**

## Troubleshooting

### Can't connect to Supabase
- Verify your API keys are correct
- Check that your project URL is correct
- Ensure your internet connection is stable

### RLS errors (403 forbidden)
- Check that RLS policies are properly configured
- Verify the user is authenticated
- Check that the user has the necessary permissions

### Realtime not working
- Verify Realtime is enabled for the tables
- Check that you've subscribed to the correct channels
- Look for errors in the browser console

### File upload fails
- Verify Storage buckets are created
- Check bucket permissions (public vs private)
- Ensure file size is within limits
- Verify MIME types are allowed

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Review the Supabase documentation
4. Ask in the Supabase Discord community

---

**Next Steps**: After completing this setup, all backend functionality runs on Supabase. No Express server or MongoDB is needed!
