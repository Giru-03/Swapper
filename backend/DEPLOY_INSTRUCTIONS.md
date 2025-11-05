# Deploy Instructions - Fix bcrypt Issue

## Problem
The `bcrypt` package uses native bindings that don't work on Vercel's Linux environment.

## Solution Applied
✅ Changed import from `bcrypt` to `bcryptjs` in `src/controllers/auth.ts`
✅ Updated `package.json` to use `@types/bcryptjs` instead of `@types/bcrypt`

## Steps to Deploy

### 1. Clean Install (Run in backend directory)
```bash
cd backend

# Remove old dependencies
rm -rf node_modules package-lock.json

# Fresh install
npm install
```

### 2. Test Locally (Optional)
```bash
npm start
# Test at http://localhost:3000
```

### 3. Commit and Push
```bash
git add .
git commit -m "Fix: Replace bcrypt with bcryptjs for Vercel compatibility"
git push origin main
```

### 4. Verify Deployment
Once Vercel redeploys, test:
- Root: https://swapper-api.vercel.app/
- Health: https://swapper-api.vercel.app/api/health
- Login: https://swapper-api.vercel.app/api/auth/login (POST)

## Why bcryptjs?
- ✅ Pure JavaScript implementation (no native bindings)
- ✅ Works on all platforms (Windows, Linux, macOS)
- ✅ API-compatible with bcrypt
- ✅ Perfect for serverless environments like Vercel

## Verification
After deployment, the error should change from:
```
{"error":"Internal server error","detail":"...invalid ELF header"}
```

To a successful response:
```json
{
  "status": "ok",
  "message": "Swapper API is running successfully! 👍",
  "timestamp": "2025-11-05T..."
}
```
