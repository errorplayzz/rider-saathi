# Render Deployment Guide for Backend

## Steps to Deploy Backend on Render:

1. **Go to [Render.com](https://render.com)** and sign up/login

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `errorplayzz/nsut-rider`
   - Select the repository

3. **Configure the service:**
   ```
   Name: rider-sathi-backend
   Region: Singapore (or closest to you)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: node src/server.js
   ```

4. **Add Environment Variables** (same as your .env):
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://sumitprajapati2468_db_user:RSproject25@rs-backend.d1fzfje.mongodb.net/
   JWT_SECRET=rider-sathi-super-secret-jwt-key-2025-development
   JWT_EXPIRE=7d
   OPENWEATHER_API_KEY=e67f7f896424c3fb60d7a235203699f7
   GROQ_MODEL=llama-3.1-8b-instant
   GROQ_API_KEY=your-groq-api-key-here
   GENERATIVE_PROVIDER=groq
   OSRM_URL=http://router.project-osrm.org
   OVERPASS_URL=https://overpass-api.de/api/interpreter
   CORS_ORIGIN=https://your-vercel-url.vercel.app
   STUN_SERVER_URL=stun:stun.l.google.com:19302
   ```

5. **Click "Create Web Service"**

6. Wait for deployment (5-10 minutes)

7. **Copy the backend URL** (will be like: `https://rider-sathi-backend.onrender.com`)

8. **Update Vercel Environment Variables:**
   - Go back to Vercel
   - Update both variables:
     - `VITE_BACKEND_URL` = `https://rider-sathi-backend.onrender.com`
     - `VITE_SOCKET_URL` = `https://rider-sathi-backend.onrender.com`
   - Save and Redeploy

## Alternative: Railway.app (Also Free)
Similar process, even easier interface!
