#!/bin/bash

# SlotSwapper Quick Start Script

echo "🚀 SlotSwapper Quick Start"
echo "========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend
echo "  Installing dependencies..."
npm install

if [ ! -f .env ]; then
    echo "  Creating .env file..."
    cat > .env << EOF
DATABASE_URL=postgresql://neondb_owner:npg_zx8NwQR0yJrZ@ep-polished-butterfly-a1hws65f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
PORT=3000
EOF
    echo "  ✓ .env created (verify DATABASE_URL is correct)"
fi

echo "✓ Backend ready"
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend
echo "  Installing dependencies..."
npm install
echo "✓ Frontend ready"
echo ""

echo "========================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Terminal 1 - Start backend:"
echo "   cd backend && npm start"
echo ""
echo "2. Terminal 2 - Start frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open browser to: http://localhost:5173"
echo ""
