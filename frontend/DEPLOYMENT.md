# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with your project

## Setup Steps

### 1. Environment Variables
Set the following environment variables in your Vercel project settings:

```
VITE_CLERK_PUBLISHABLE_KEY = your_clerk_publishable_key
VITE_BACKEND_URL = https://your-backend-url.render.com
```

### 2. Build Configuration
The `vercel.json` file is already configured to:
- Use `npm run build` as the build command
- Output to the `dist` directory
- Handle client-side routing with rewrites to `/index.html`

### 3. Deploy via Vercel Console
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your repository
4. Framework: Select "Vite"
5. Add Environment Variables
6. Click "Deploy"

### 4. Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Important Notes

### Backend URL Configuration
- **Development**: `VITE_BACKEND_URL = http://localhost:3000`
- **Production**: `VITE_BACKEND_URL = https://your-render-backend.onrender.com`

The backend URL should match your Render deployment URL.

### Client-Side Routing
The `vercel.json` configuration ensures that:
- All non-API routes are rewritten to `/index.html`
- React Router can handle all navigation
- Page refreshes work correctly at any route

### Build Output
- Source: `/src`
- Output: `/dist`
- BuildCommand: `npm run build`
- Framework: Vite

## Troubleshooting

### 404 Issues on Routes
- Already handled by `vercel.json` rewrites
- Ensure client-side routing is properly configured in React Router

### Backend Connection Issues
- Verify `VITE_BACKEND_URL` is correctly set in Vercel environment
- Check CORS settings on backend
- Ensure backend is accessible from Vercel domain

### Build Failures
- Run `npm install` locally to ensure all dependencies are correct
- Check `npm run build` output for TypeScript errors
- Review `type-check` script: `npm run type-check`

## Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview build locally
npm run preview

# Type check
npm run type-check
```
