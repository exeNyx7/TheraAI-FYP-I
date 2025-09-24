# Environment Configuration Guide

This document explains how to set up and use environment variables for the TheraAI project.

## 📁 Environment Files Structure

```
TheraAI-FYP-I/
├── .env.docker              # Docker compose environment
├── backend/
│   ├── .env                 # Backend development environment
│   └── .env.example         # Backend environment template
└── web/
    ├── .env                 # Frontend development environment
    └── .env.example         # Frontend environment template
```

## 🚀 Quick Setup

### 1. Backend Environment Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

### 2. Frontend Environment Setup

```bash
cd web
cp .env.example .env
# Edit .env with your actual values
```

### 3. Docker Environment Setup

```bash
# Copy the docker environment file if needed
cp .env.docker .env.docker.local
# Edit .env.docker.local with your production values
```

## 🔑 Required Environment Variables

### Backend (.env)

**Essential for development:**
```env
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=theraai_dev

# Security (CHANGE THESE!)
SECRET_KEY=your-secret-key-here

# AI Configuration (ADD YOUR KEYS)
OPENAI_API_KEY=your-openai-api-key-here
```

### Frontend (.env)

**Essential for development:**
```env
# API Configuration
VITE_API_URL=http://localhost:8000

# Application Settings
VITE_APP_NAME=TheraAI
VITE_ENVIRONMENT=development
```

## 🛠️ Development Usage

### Local Development

1. **Start Backend:**
```bash
cd backend
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start server (reads from backend/.env)
uvicorn app.main:app --reload
```

2. **Start Frontend:**
```bash
cd web
# Install dependencies
npm install

# Start dev server (reads from web/.env)
npm run dev
```

### Docker Development

```bash
# Uses .env.docker for backend configuration
docker-compose up --build
```

## 🔒 Security Best Practices

### ✅ DO:
- Use `.env.example` files as templates
- Keep actual API keys in `.env` files only
- Use different keys for development and production
- Add `.env` files to `.gitignore`
- Use strong, unique secret keys

### ❌ DON'T:
- Commit actual `.env` files to Git
- Share API keys in chat or email
- Use default/weak secret keys in production
- Store credentials in source code

## 📝 Environment Variables Reference

### Backend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_NAME` | Application name | TheraAI Backend | No |
| `DEBUG` | Debug mode | True | No |
| `MONGODB_URL` | Database connection | mongodb://localhost:27017 | Yes |
| `SECRET_KEY` | JWT secret key | dev-key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | None | For AI features |
| `CORS_ORIGINS` | Allowed origins | ["http://localhost:3000"] | No |

### Frontend Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:8000 | Yes |
| `VITE_APP_NAME` | App display name | TheraAI | No |
| `VITE_ENVIRONMENT` | Environment name | development | No |
| `VITE_DEBUG_MODE` | Debug mode | true | No |

## 🔄 Environment Loading Order

1. **Backend:** `.env` → System environment → Default values
2. **Frontend:** `.env` → System environment → Vite defaults
3. **Docker:** `.env.docker` → docker-compose environment → Container defaults

## 🧪 Testing Environments

### Backend Testing
```bash
# Use test database
MONGODB_DATABASE=theraai_test pytest
```

### Frontend Testing
```bash
# Use test API URL
VITE_API_URL=http://localhost:8001 npm test
```

## 🚀 Production Deployment

### Backend Production
```env
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=use-openssl-rand-base64-32-to-generate-strong-key
MONGODB_URL=your-production-mongodb-url
OPENAI_API_KEY=your-production-openai-key
```

### Frontend Production
```env
VITE_ENVIRONMENT=production
VITE_API_URL=https://your-api-domain.com
VITE_DEBUG_MODE=false
```

## 🆘 Troubleshooting

### Backend Issues
```bash
# Check if environment is loading
curl http://localhost:8000/config

# Verify environment variables
python -c "from app.config import settings; print(settings.app_name)"
```

### Frontend Issues
```bash
# Check environment variables in browser console
console.log(import.meta.env)

# Verify Vite environment loading
npm run dev -- --debug
```

### Common Problems

1. **API Connection Failed**
   - Check `VITE_API_URL` matches backend URL
   - Verify CORS origins include frontend URL

2. **Database Connection Failed**
   - Verify `MONGODB_URL` is correct
   - Check if MongoDB is running

3. **Environment Variables Not Loading**
   - Ensure `.env` file exists
   - Check file permissions
   - Restart development servers

## 📞 Support

If you encounter issues with environment configuration:

1. Check this README
2. Verify your `.env` files match the examples
3. Ensure all required variables are set
4. Check the console/logs for specific error messages

---

*Remember: Keep your `.env` files secure and never commit them to version control!*