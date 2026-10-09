# 📍 Phone Tracker

Real-time phone location tracking on an interactive map. Built with Next.js, Firebase Realtime Database, and Leaflet (OpenStreetMap).

## Features

- **Live Tracking** — See all tracked devices on a dark-themed map in real-time
- **Route History** — Dashed trail showing each device's movement path
- **Multi-Device** — Track unlimited phones simultaneously
- **No API Keys for Maps** — Uses free OpenStreetMap tiles via CARTO
- **Mobile-Friendly** — Responsive design works on phones and desktops
- **One-Click Deploy** — Fully deployable on Vercel

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/` | Map view with all tracked devices |
| Track | `/track` | Open on a phone to share its location |

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Realtime Database enabled

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.
Open [http://localhost:3000/track](http://localhost:3000/track) on a phone (same network) to start tracking.

### Deploy to Vercel

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add these **Environment Variables** in Vercel project settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | https://your-project-default-rtdb.firebaseio.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your-project-id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | your-project.firebasestorage.app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | your sender id |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | your app id |

4. Click **Deploy**!

## How It Works

1. User opens `/track` on their phone
2. Browser's Geolocation API captures GPS coordinates
3. Location is sent to Firebase Realtime Database
4. Dashboard (`/`) subscribes to Firebase and updates the map live
5. Route history is stored and displayed as dashed polylines

## Tech Stack

- **Next.js 14** (App Router)
- **Firebase Realtime Database** (real-time sync)
- **Leaflet + react-leaflet** (maps)
- **CARTO Dark Matter** (dark map tiles)
- **Vercel** (hosting)
