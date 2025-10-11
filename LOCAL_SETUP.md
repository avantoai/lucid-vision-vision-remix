# Local Development Setup Guide

## Environment Variables Setup

When you pull this code from GitHub to your local machine, you need to set up environment variables because **Replit Secrets do NOT sync to your local environment**.

### Step 1: Create a `.env` file

In the root directory (where `server/` and `mobile/` folders are):

```bash
cp .env.example .env
```

### Step 2: Fill in Your Values

Open `.env` and add your actual API keys and configuration:

```env
# Get these from your Supabase project dashboard
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Get these from OpenAI and ElevenLabs
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# For local development (backend running locally)
REDIRECT_URL=http://localhost:5000/api/auth/callback
EXPO_DEV_URL=exp://192.168.1.xxx:8081  # Replace xxx with your computer's local IP

# Generate a random string
SESSION_SECRET=some-random-secret-string
```

### Step 3: Find Your Local IP Address

**On Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
```

Look for your local network IP (usually starts with `192.168.` or `10.`), then update `EXPO_DEV_URL` with that IP.

### Step 4: Start the Backend Locally (Optional)

If you want to run the backend on your local machine instead of using Replit:

```bash
npm install
npm start
```

The server will run on `http://localhost:5000`

### Step 5: Configure Mobile App Backend URL

The mobile app needs to know where the backend is running. You have two options:

**Option A: Using Replit Backend (Recommended for testing)**

Create `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://efe0d848-defb-45bf-93a8-d47416aa6bb6-00-khvs2qxfftpl.riker.replit.dev/api
```

**Option B: Using Local Backend**

Create `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Or if testing on a physical device (not simulator), use your computer's local IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.xxx:5000/api
```

### Step 6: Start Expo

In the `mobile/` directory:

```bash
npm install
npx expo start
```

## Environment-Specific Configuration

### Running Backend on Replit + Mobile Locally

If you keep the backend on Replit but run mobile locally:

```env
REDIRECT_URL=https://your-replit-domain.replit.dev/api/auth/callback
EXPO_DEV_URL=exp://192.168.1.xxx:8081
```

**Note:** The mobile app's `API_BASE_URL` in `mobile/src/services/api.ts` should point to your Replit backend URL.

### Running Everything Locally

If you run both backend and mobile locally:

```env
REDIRECT_URL=http://localhost:5000/api/auth/callback
EXPO_DEV_URL=exp://192.168.1.xxx:8081
```

**Note:** Update `API_BASE_URL` in `mobile/src/services/api.ts` to `http://localhost:5000`

## Troubleshooting

### Magic Link Not Working

1. **Check your REDIRECT_URL** - It should match where your backend is running
2. **Check your EXPO_DEV_URL** - It should match your computer's local IP
3. **Restart the backend** after changing `.env` values
4. **Check Expo console** for deep link logs

### "Could not connect to the server" Error

This usually means:
- The backend URL in the mobile app doesn't match where the backend is actually running
- The EXPO_DEV_URL doesn't match your actual local IP
- The .env file is missing or has wrong values

## Security Note

**Never commit `.env` to Git!** It's already in `.gitignore`. The `.env` file contains sensitive API keys and should only exist on your local machine.
