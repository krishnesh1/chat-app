# Realtime Chat App 🚀

Full-stack real-time chat application built with Express, Socket.IO, MongoDB, React, Tailwind CSS, and DaisyUI.

---

## 🔗 Local URLs

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend:** [http://localhost:5001](http://localhost:5001)
- **Health Check Endpoint:** [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🛠️ Required Setup & Environment Variables

### 1. Backend Environment Variables (Render)
Create these in your Render Web Service settings (`Environment` tab):

| Variable | Example / Description |
|---|---|
| `PORT` | `5001` (or leave default, Render sets this automatically) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/chat-app?retryWrites=true&w=majority` (MongoDB Atlas connection string) |
| `JWT_SECRET` | A secure random string (e.g. `openssl rand -hex 32`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name (for image attachments & avatars) |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `CLIENT_URL` | Your frontend Vercel URL (e.g. `https://your-app.vercel.app`) |

### 2. Frontend Environment Variables (Vercel)
Create this in your Vercel Project settings (`Settings -> Environment Variables`):

| Variable | Example / Description |
|---|---|
| `VITE_BACKEND_URL` | `https://chat-app-jlgx.onrender.com` (Your Render backend domain, no trailing slash) |

---

## 🚀 How to Deploy

### Step 1: Backend on Render (Already Live! ✅)
- **Live Backend URL:** [https://chat-app-jlgx.onrender.com](https://chat-app-jlgx.onrender.com)
- **Live Health Check:** [https://chat-app-jlgx.onrender.com/api/health](https://chat-app-jlgx.onrender.com/api/health)

### Step 2: Prevent Render Free Tier from Sleeping (Cron Job)
Render's free tier spins down after 15 minutes of inactivity. Use the built-in Health API with a free cron job service:
- **Health Endpoint:** `https://chat-app-jlgx.onrender.com/api/health`
1. Go to [cron-job.org](https://cron-job.org) (or [UptimeRobot](https://uptimerobot.com)).
2. Create a new Cronjob / Monitor:
   - **URL:** `https://chat-app-jlgx.onrender.com/api/health`
   - **Schedule:** Every **10 minutes** (or 14 minutes).
   - **Method:** `GET`
3. This keeps your Render instance awake 24/7 without cold starts!

### Step 3: Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) -> **Add New** -> **Project**.
2. Select your GitHub repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**:
   - Add `VITE_BACKEND_URL` = `https://your-backend.onrender.com`
5. Click **Deploy**.
6. Once deployed, copy your Vercel URL (e.g. `https://your-app.vercel.app`) and update the `CLIENT_URL` variable in your Render backend settings.
