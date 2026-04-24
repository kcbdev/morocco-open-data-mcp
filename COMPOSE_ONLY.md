# 🚀 Coolify Deployment - Docker Compose Only

## Simple Deployment Steps

### 1. Create Git Repository
Push this project to your Git provider (GitHub/GitLab):

```bash
cd "/home/kcb/Work/LABS/MoroccoOpenData MCP"
git init
git add .
git commit -m "Morocco Open Data MCP - Ready for Coolify"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy in Coolify

1. **Go to Coolify**: https://coolify.kcb.ma

2. **Create New Resource**:
   - Click "+ New Resource"
   - Select **"Git Repository"**
   - Connect your Git provider
   - Select repository: `morocco-open-data-mcp`
   - Branch: `main`

3. **Build Configuration**:
   - **Build Command**: `npm run build`
   - **Install Command**: `npm ci --only=production`
   - **Start Command**: `node dist/index.js`
   - **Dockerfile**: Select existing `Dockerfile`

4. **Domain Configuration**:
   - Add domain: `morocco-od-mcp.kcb.ma`
   - Enable HTTPS/SSL (Let's Encrypt) ✅

5. **Environment Variables**:
   ```
   NODE_ENV=production
   MCP_PORT=3000
   MCP_HOST=0.0.0.0
   CACHE_TTL_DEFAULT=3600
   RATE_LIMIT_DEFAULT=60
   BAM_KEY_CHANGES=your_key_here
   BAM_KEY_OBLIGATIONS=your_key_here
   BAM_KEY_TBILLS=your_key_here
   ```

6. **Click Deploy** ✅

Coolify will:
- Clone the repository
- Build the Docker image
- Deploy with Traefik routing
- Enable SSL automatically

---

## Get API Keys

**Bank Al-Maghrib** (Required):
https://www.bkam.ma/en/Statistical-Data

---

## Verify

After deployment:
- Service status: **Running** ✅
- Health check: **Green** ✅
- URL: **https://morocco-od-mcp.kcb.ma**

