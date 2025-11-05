# Heroku Deployment Guide for Swapper Backend

## ✅ Files Prepared for Heroku:

1. **Procfile** - Tells Heroku how to start your app
2. **package.json** - Updated with build scripts and Node.js version
3. **tsconfig.json** - Configured for TypeScript compilation
4. **server.ts** - Updated to always start Socket.IO server

## 📋 Prerequisites:

1. **Heroku CLI** - Install from: https://devcenter.heroku.com/articles/heroku-cli
2. **Git** - Make sure your code is committed
3. **Heroku Account** - Sign up at: https://heroku.com

## 🚀 Deployment Steps:

### Step 1: Install Heroku CLI
```bash
# Windows (use installer from heroku.com/cli)
# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Login to Heroku
```bash
heroku login
# This will open a browser window to log in
```

### Step 3: Create Heroku App (from backend directory)
```bash
cd backend

# Create a new Heroku app
heroku create swapper-backend
# Or use: heroku create (it will generate a random name)
```

### Step 4: Add PostgreSQL Database
```bash
# If you want to use Heroku Postgres instead of Neon:
heroku addons:create heroku-postgresql:essential-0

# Or keep using your Neon database (skip this step)
```

### Step 5: Set Environment Variables
```bash
# Set your DATABASE_URL (use your Neon URL or Heroku Postgres URL)
heroku config:set DATABASE_URL="postgresql://neondb_owner:npg_zx8NwQR0yJrZ@ep-polished-butterfly-a1hws65f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Set JWT_SECRET
heroku config:set JWT_SECRET="your_super_secret_jwt_key_change_this_in_production"

# Set NODE_ENV
heroku config:set NODE_ENV="production"
```

### Step 6: Build and Deploy
```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main

# If you're on a different branch:
# git push heroku your-branch-name:main
```

### Step 7: Check Logs
```bash
# View real-time logs
heroku logs --tail

# Check if the server started successfully
heroku ps
```

### Step 8: Open Your App
```bash
# Open the app in browser
heroku open

# Or visit: https://your-app-name.herokuapp.com/
```

## 🔍 Verify Deployment:

Test these endpoints:
- Root: `https://your-app-name.herokuapp.com/`
- Health: `https://your-app-name.herokuapp.com/api/health`
- Auth: `https://your-app-name.herokuapp.com/api/auth/login` (POST)

## 🔧 Update Frontend to Use Heroku Backend:

### Update frontend/.env:
```env
VITE_API_URL=https://your-app-name.herokuapp.com
```

### Then rebuild and redeploy frontend:
```bash
cd ../frontend
# Update .env file with your Heroku URL
git add .
git commit -m "Update API URL to Heroku backend"
git push
```

## 🔄 Making Updates:

After making changes to your code:
```bash
cd backend
git add .
git commit -m "Your update message"
git push heroku main
```

## 📊 Useful Heroku Commands:

```bash
# View app info
heroku info

# View config variables
heroku config

# View logs
heroku logs --tail

# Restart app
heroku restart

# Open app in browser
heroku open

# Run commands in Heroku (like migrations)
heroku run npm run migrate

# Scale dynos
heroku ps:scale web=1

# Access Heroku bash
heroku run bash
```

## ⚠️ Important Notes:

1. **Free Tier**: Heroku free tier apps sleep after 30 minutes of inactivity. Consider upgrading to Eco ($5/month) for 24/7 uptime.

2. **Build Process**: Heroku will automatically run `npm install` and `npm run build` (which compiles TypeScript to JavaScript).

3. **Port**: Heroku automatically sets the PORT environment variable. Your app uses `process.env.PORT` which is correct.

4. **Database**: Your Neon database will continue to work. Alternatively, you can use Heroku Postgres.

5. **WebSockets/Socket.IO**: ✅ Fully supported on Heroku!

## 🐛 Troubleshooting:

### If deployment fails:
```bash
# Check build logs
heroku logs --tail

# Check build status
heroku builds

# Restart the app
heroku restart
```

### If app crashes:
```bash
# Check logs for errors
heroku logs --tail --source app

# Check dyno status
heroku ps
```

### If Socket.IO doesn't connect:
1. Make sure CORS allows your frontend domain
2. Check that the frontend is using the correct Heroku URL
3. Verify the JWT token is being sent in socket auth

## 💰 Cost Estimate:

- **Eco Dyno**: $5/month (always on, no sleep)
- **Basic Dyno**: $7/month (better performance)
- **Heroku Postgres** (if using): $5-9/month
- **Your Neon DB**: Keep using it for free!

**Recommended**: Eco dyno ($5/month) + Neon database (free) = $5/month total

## 🎉 Success!

Once deployed, your backend will be running 24/7 with full Socket.IO support for real-time notifications!

Your Heroku URL will be something like:
- `https://swapper-backend-abc123.herokuapp.com/`

Update your frontend to use this URL and you're done! 🚀
