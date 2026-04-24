# Deploy to Coolify

## Quick Deploy (3 steps)

### 1. Push to Git
```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy in Coolify
1. Go to https://coolify.kcb.ma
2. **+ New Resource** → **Git Repository**
3. Select this repository
4. Domain: `morocco-od-mcp.kcb.ma`
5. Click **Deploy**

### 3. Add API Keys
In Coolify Environment Variables:
```
BAM_KEY_CHANGES=your_key
BAM_KEY_OBLIGATIONS=your_key
BAM_KEY_TBILLS=your_key
```

Get keys: https://www.bkam.ma/en/Statistical-Data

---

## Build Settings (Auto-detected)

- **Build Command**: `npm run build`
- **Install Command**: `npm ci --only=production`
- **Start Command**: `node dist/index.js`
- **Dockerfile**: ✅ Uses existing Dockerfile
- **Port**: 3000

Coolify handles:
- ✅ Docker build
- ✅ SSL/TLS certificates
- ✅ Traefik routing
- ✅ Health checks
- ✅ Auto-deploy on push

---

## After Deploy

**URL**: https://morocco-od-mcp.kcb.ma

**Connect Claude Desktop**:
```json
{
  "mcpServers": {
    "morocco-open-data": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest"],
      "env": {
        "MCP_SERVER_URL": "https://morocco-od-mcp.kcb.ma"
      }
    }
  }
}
```
