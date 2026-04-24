# 🚀 Quick Deploy - Morocco Open Data MCP Server

## One-Command Deployment to Coolify

```bash
# Full automated deployment (build, push, deploy, verify)
./deploy-to-coolify.sh --all
```

## Prerequisites

1. **Coolify Running on VPS**
   - VPS IP: `41.251.6.165`
   - SSH User: `qwen`
   - Coolify URL: `https://coolify.kcb.ma`

2. **Domain Configured**
   - DNS A record: `morocco-od-mcp.kcb.ma` → `41.251.6.165`
   - SSL enabled in Coolify

3. **Docker Installed** (local machine)
   ```bash
   # Install Docker if needed
   curl -fsSL https://get.docker.com | sh
   ```

## Deployment Steps

### Option 1: Automated Script (Recommended)

```bash
# Navigate to project
cd "/home/kcb/Work/LABS/MoroccoOpenData MCP"

# Set environment variables (optional - has defaults)
export VPS_HOST="41.251.6.165"
export VPS_USER="qwen"
export DOMAIN="morocco-od-mcp.kcb.ma"

# Run deployment
./deploy-to-coolify.sh --all
```

The script will:
- ✅ Build Docker image locally
- ✅ Push to container registry
- ✅ Deploy to Coolify via SSH
- ✅ Configure Traefik routing
- ✅ Verify deployment
- ✅ Show status

### Option 2: Manual Coolify UI

1. **Access Coolify**: `https://coolify.kcb.ma`

2. **Create New Resource**:
   - Click "+ New Resource"
   - Select "Docker Compose"
   - Choose your VPS destination

3. **Paste Configuration**:
   Copy from `docker-compose.coolify.yml` or use this minimal config:

   ```yaml
   version: '3.8'
   services:
     morocco-open-data-mcp:
       image: ghcr.io/kcb/morocco-open-data-mcp:latest
       container_name: morocco-open-data-mcp
       restart: unless-stopped
       expose:
         - "3000"
       environment:
         - NODE_ENV=production
         - MCP_PORT=3000
         - MCP_HOST=0.0.0.0
       healthcheck:
         test: ["CMD", "node", "-e", "console.log('healthy')"]
         interval: 30s
         timeout: 10s
         retries: 3
       networks:
         - coolify
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.morocco-open-data-mcp.rule=Host(`morocco-od-mcp.kcb.ma`)"
         - "traefik.http.routers.morocco-open-data-mcp.entrypoints=websecure"
         - "traefik.http.routers.morocco-open-data-mcp.tls=true"
         - "traefik.http.routers.morocco-open-data-mcp.tls.certresolver=letsencrypt"
         - "traefik.http.services.morocco-open-data-mcp.loadbalancer.server.port=3000"
   networks:
     coolify:
       external: true
   ```

4. **Add Environment Variables** in Coolify UI:
   ```
   NODE_ENV=production
   MCP_PORT=3000
   MCP_HOST=0.0.0.0
   BAM_KEY_CHANGES=your_key
   BAM_KEY_OBLIGATIONS=your_key
   BAM_KEY_TBILLS=your_key
   ```

5. **Deploy** - Click the Deploy button

## API Keys Required

Get these before deployment:

| Service | Get Key From | Required |
|---------|--------------|----------|
| Bank Al-Maghrib | https://www.bkam.ma/en/Statistical-Data | ✅ Yes |
| World Bank | https://datahelpdesk.worldbank.org/dataconnect/ | ❌ Optional |
| OpenWeatherMap | https://openweathermap.org/api | ❌ Optional |

## Verify Deployment

```bash
# Check container status (via SSH)
ssh qwen@41.251.6.165 "docker ps | grep morocco-open-data-mcp"

# View logs
ssh qwen@41.251.6.165 "docker logs -f morocco-open-data-mcp"

# Test domain
curl -I https://morocco-od-mcp.kcb.ma

# Health check
ssh qwen@41.251.6.165 "docker exec morocco-open-data-mcp node -e \"console.log('healthy')\""
```

## Connect Claude Desktop

Add to your MCP config (e.g., `~/.qwen/settings.json`):

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

**Or via SSH stdio**:

```json
{
  "mcpServers": {
    "morocco-open-data": {
      "command": "ssh",
      "args": [
        "qwen@41.251.6.165",
        "docker", "exec", "-i",
        "morocco-open-data-mcp",
        "node", "dist/index.js"
      ]
    }
  }
}
```

## Troubleshooting

### Container won't start
```bash
# SSH to VPS
ssh qwen@41.251.6.165

# Check logs
docker logs morocco-open-data-mcp

# Restart
docker restart morocco-open-data-mcp
```

### SSL certificate not working
- Wait 5-10 minutes for Let's Encrypt provisioning
- Check Coolify → SSL certificates
- Verify DNS is pointing correctly: `nslookup morocco-od-mcp.kcb.ma`

### API errors in logs
- Check environment variables are set correctly
- Verify API keys are valid
- Test API connectivity from VPS

## Useful Commands

```bash
# Redeploy from Coolify UI
# Click "Redeploy" on the service

# Or manually via SSH
ssh qwen@41.251.6.165 "docker restart morocco-open-data-mcp"

# Update to latest image
ssh qwen@41.251.6.165 "docker pull ghcr.io/kcb/morocco-open-data-mcp:latest && docker restart morocco-open-data-mcp"

# View real-time stats
ssh qwen@41.251.6.165 "docker stats morocco-open-data-mcp"

# Access container shell
ssh qwen@41.251.6.165 "docker exec -it morocco-open-data-mcp sh"
```

## Support

- **Documentation**: See `README.md` and `DEPLOYMENT_COOLIFY.md`
- **Coolify Docs**: https://coolify.io/docs
- **Logs**: Check Coolify dashboard or `docker logs`

---

**🎉 You're done!** Your Morocco Open Data MCP server is live at:
**https://morocco-od-mcp.kcb.ma**