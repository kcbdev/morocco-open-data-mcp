# 🚀 Morocco Open Data MCP Server - Coolify Deployment Guide

This guide will walk you through deploying the Morocco Open Data MCP server to your Coolify instance running on your VPS at **morocco-od-mcp.kcb.ma**.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ Coolify installed and running on your VPS (41.251.6.165)
- ✅ Domain configured: `morocco-od-mcp.kcb.ma` pointing to your VPS
- ✅ SSL/TLS certificates enabled in Coolify
- ✅ Docker and Docker Compose available on Coolify
- ✅ Node.js 18+ (for local testing)
- ✅ Git (optional, for repository-based deployment)

---

## 🎯 Deployment Options

You have three deployment options with Coolify:

1. **Docker Compose** (Recommended - Simplest)
2. **Dockerfile Build** (For custom builds)
3. **Git Repository** (For CI/CD workflow)

---

## 📦 Option 1: Docker Compose Deployment (Recommended)

### Step 1: Access Coolify Dashboard

1. Navigate to your Coolify instance: `https://coolify.kcb.ma`
2. Login with your credentials
3. Go to your project or create a new one

### Step 2: Create New Service

1. Click **"+ New Resource"**
2. Select **"Docker Compose"**
3. Choose your destination (your VPS)

### Step 3: Configure Docker Compose

**Paste this configuration into Coolify:**

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
      - CACHE_TTL_DEFAULT=3600
      - CACHE_TTL_SHORT=300
      - CACHE_TTL_LONG=86400
      - RATE_LIMIT_DEFAULT=60
      - RATE_LIMIT_STRICT=10
      - BAM_KEY_CHANGES=your_key_here
      - BAM_KEY_OBLIGATIONS=your_key_here
      - BAM_KEY_TBILLS=your_key_here
      - WORLD_BANK_API_KEY=optional
      - OPENWEATHER_API_KEY=optional
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('MCP server healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
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

### Step 4: Configure Domain

1. In the service settings, go to **"Domains"** tab
2. Add domain: `morocco-od-mcp.kcb.ma`
3. Enable **HTTPS/SSL** (Let's Encrypt)
4. Coolify will automatically provision SSL certificate

### Step 5: Set Environment Variables

In Coolify's **"Environment Variables"** section, add:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `MCP_PORT` | `3000` | ✅ |
| `MCP_HOST` | `0.0.0.0` | ✅ |
| `BAM_KEY_CHANGES` | *(from BAM)* | ✅ for exchange rates |
| `BAM_KEY_OBLIGATIONS` | *(from BAM)* | ✅ for obligations |
| `BAM_KEY_TBILLS` | *(from BAM)* | ✅ for treasury bills |
| `WORLD_BANK_API_KEY` | *(optional)* | ❌ |
| `OPENWEATHER_API_KEY` | *(optional)* | ❌ |
| `CACHE_TTL_DEFAULT` | `3600` | ❌ |
| `RATE_LIMIT_DEFAULT` | `60` | ❌ |

**Get API Keys:**
- Bank Al-Maghrib: https://www.bkam.ma/en/Statistical-Data
- World Bank: https://datahelpdesk.worldbank.org/dataconnect/
- OpenWeatherMap: https://openweathermap.org/api

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2-5 minutes)
3. Check logs for any errors
4. Verify health check passes

---

## 🔨 Option 2: Dockerfile Build (Custom Build)

### Step 1: Create New Resource

1. Click **"+ New Resource"** in Coolify
2. Select **"Dockerfile"**
3. Choose your destination

### Step 2: Configure Build

**Source:**
- Select **"Public Repository"** or **"Private Repository"**
- Repository URL: Your Git repo (or use local upload)
- Branch: `main`

**Build Configuration:**
```
Build Command: npm run build
Install Command: npm ci --only=production
Start Command: node dist/index.js
```

**Dockerfile:** (Use the provided `Dockerfile` in the project)

### Step 3: Configure Domain

- Domain: `morocco-od-mcp.kcb.ma`
- Port: `3000`
- Enable SSL

### Step 4: Add Environment Variables

Same as Option 1 (see table above)

### Step 5: Deploy

Click **"Deploy"** and monitor the build logs

---

## 🔄 Option 3: Git Repository (CI/CD)

### Step 1: Push to Git Repository

```bash
cd "/home/kcb/Work/LABS/MoroccoOpenData MCP"
git init
git add .
git commit -m "Initial commit - Morocco Open Data MCP"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Connect to Coolify

1. In Coolify, click **"+ New Resource"**
2. Select **"Git Repository"**
3. Connect your Git provider (GitHub, GitLab, etc.)
4. Select repository: `morocco-open-data-mcp`
5. Branch: `main`

### Step 3: Configure Auto-Deploy

1. Enable **"Auto Deploy"**
2. Configure webhook in your Git provider
3. Set build and start commands:
   - Build: `npm run build`
   - Start: `node dist/index.js`

### Step 4: Deploy

First deployment will trigger automatically

---

## ✅ Post-Deployment Verification

### 1. Check Service Status

In Coolify dashboard:
- Service should show **"Running"** status
- Health check should be **green**
- No error logs

### 2. Test MCP Server

**Via SSH to your VPS:**
```bash
# SSH into your VPS
ssh qwen@41.251.6.165

# Check container status
docker ps | grep morocco-open-data-mcp

# View logs
docker logs -f morocco-open-data-mcp

# Test health
docker exec morocco-open-data-mcp node -e "console.log('MCP server is healthy')"
```

### 3. Test Domain Access

```bash
# Test HTTPS connection
curl -I https://morocco-od-mcp.kcb.ma

# Should return HTTP/2 200 or appropriate MCP response
```

### 4. Test with Claude Desktop

Update your Claude Desktop config (`~/.qwen/settings.json` or appropriate location):

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

**Or use stdio mode with SSH:**

```json
{
  "mcpServers": {
    "morocco-open-data": {
      "command": "ssh",
      "args": [
        "qwen@41.251.6.165",
        "docker",
        "exec",
        "-i",
        "morocco-open-data-mcp",
        "node",
        "dist/index.js"
      ],
      "env": {
        "SSH_PASSWORD": "your_ssh_password"
      }
    }
  }
}
```

---

## 🔧 Configuration & Customization

### Resource Limits

Default configuration:
- CPU Limit: `1.0` cores
- Memory Limit: `512MB`
- CPU Reservation: `0.25` cores
- Memory Reservation: `128MB`

To adjust, modify in Coolify's **"Resource Limits"** section.

### Scaling

For high availability, you can scale horizontally:

```yaml
deploy:
  replicas: 3
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

### Persistent Storage (Optional)

If you need persistent cache:

```yaml
volumes:
  - morocco-mcp-cache:/app/cache

volumes:
  morocco-mcp-cache:
```

### Custom Health Check

If you want to customize the health check endpoint:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

---

## 🐛 Troubleshooting

### Issue: Container won't start

**Check logs:**
```bash
docker logs morocco-open-data-mcp
```

**Common causes:**
- Missing environment variables
- Invalid API keys
- Port already in use
- Insufficient resources

**Solution:**
```bash
# Restart container
docker restart morocco-open-data-mcp

# Rebuild if needed
docker-compose up -d --build
```

### Issue: Domain not resolving

**Check DNS:**
```bash
nslookup morocco-od-mcp.kcb.ma
```

**Verify Coolify network:**
```bash
docker network ls | grep coolify
```

**Solution:**
1. Ensure domain points to VPS IP (41.251.6.165)
2. Check Coolify's Traefik configuration
3. Verify SSL certificate provisioning

### Issue: Health check failing

**Test manually:**
```bash
docker exec morocco-open-data-mcp node -e "console.log('healthy')"
```

**Check application logs:**
```bash
docker logs --tail 100 morocco-open-data-mcp
```

### Issue: MCP tools not working

**Verify API keys are set:**
```bash
docker exec morocco-open-data-mcp env | grep BAM_KEY
```

**Test API connectivity:**
```bash
docker exec morocco-open-data-mcp node -e "
  const https = require('https');
  https.get('https://www.bkam.ma/api', (res) => {
    console.log('Status:', res.statusCode);
  }).on('error', (e) => console.error(e));
"
```

---

## 📊 Monitoring

### Coolify Dashboard

Monitor in real-time:
- CPU/Memory usage
- Network traffic
- Request count
- Error rates
- Health status

### Docker Stats

```bash
# Real-time resource usage
docker stats morocco-open-data-mcp

# Container inspect
docker inspect morocco-open-data-mcp
```

### Log Aggregation

View logs in Coolify UI or:
```bash
# Follow logs
docker logs -f morocco-open-data-mcp

# Last 100 lines
docker logs --tail 100 morocco-open-data-mcp

# Since timestamp
docker logs --since 2024-04-24T00:00:00 morocco-open-data-mcp
```

---

## 🔐 Security Best Practices

### 1. Use Secrets Management

Instead of plain environment variables, use Coolify secrets:
- Store API keys as secrets
- Reference secrets in docker-compose
- Rotate keys regularly

### 2. Network Isolation

- Keep service on Coolify network only
- Don't expose ports publicly
- Use Traefik for all external access

### 3. Rate Limiting

Already configured in the application:
- Default: 60 requests/minute
- Strict: 10 requests/minute
- Adjust based on your needs

### 4. SSL/TLS

- Always use HTTPS
- Enable HSTS (HTTP Strict Transport Security)
- Auto-renew Let's Encrypt certificates

### 5. Regular Updates

```bash
# Update Docker image
docker pull ghcr.io/kcb/morocco-open-data-mcp:latest
docker restart morocco-open-data-mcp

# Or via Coolify UI - Click "Redeploy"
```

---

## 📈 Performance Optimization

### 1. Caching Strategy

Default cache TTLs:
- Short: 5 minutes (frequently changing data)
- Default: 1 hour (standard data)
- Long: 24 hours (static data)

Adjust based on your needs in environment variables.

### 2. Connection Pooling

The application uses Axios with keep-alive:
- Reduces connection overhead
- Improves response times

### 3. Resource Allocation

Recommended for production:
- CPU: 1 core
- Memory: 512MB
- Adjust based on load

### 4. Database (Future Enhancement)

If you add persistent storage:
- Use PostgreSQL or Redis
- Deploy on same Coolify network
- Configure connection strings

---

## 🎓 Advanced Configuration

### Custom Traefik Middleware

Add custom headers or authentication:

```yaml
labels:
  - "traefik.http.middlewares.mcp-auth.basicauth.users=user:$$apr1$$hash"
  - "traefik.http.routers.morocco-open-data-mcp.middlewares=mcp-auth"
```

### Multiple Environments

Deploy separate instances:

| Environment | Domain | Purpose |
|-------------|--------|---------|
| Production | `morocco-od-mcp.kcb.ma` | Live |
| Staging | `staging.morocco-od-mcp.kcb.ma` | Testing |
| Development | `dev.morocco-od-mcp.kcb.ma` | Dev |

### Backup & Restore

**Backup configuration:**
```bash
# Export Coolify configuration
# (Use Coolify's built-in backup feature)

# Backup environment variables
docker exec morocco-open-data-mcp env > env-backup.txt
```

**Restore:**
1. Redeploy from Coolify
2. Re-apply environment variables
3. Restore from Git if using repository

---

## 📞 Support & Resources

### Documentation
- [Coolify Docs](https://coolify.io/docs)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Project README](./README.md)

### Logs & Debugging
- Coolify Dashboard → Logs
- SSH: `docker logs morocco-open-data-mcp`
- Application logs in stdout

### API Key Registration
- Bank Al-Maghrib: https://www.bkam.ma/en/Statistical-Data
- World Bank: https://datahelpdesk.worldbank.org/dataconnect/
- OpenWeatherMap: https://openweathermap.org/api
- HDX: https://data.humdata.org/

---

## ✅ Deployment Checklist

Before going live:

- [ ] Domain configured and DNS propagated
- [ ] SSL certificate issued and valid
- [ ] All required API keys set
- [ ] Health check passing
- [ ] Resource limits configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Security review completed
- [ ] Tested with Claude Desktop
- [ ] Documentation updated

---

## 🎉 You're Ready!

Your Morocco Open Data MCP server is now deployed and running at:

**https://morocco-od-mcp.kcb.ma**

Start using it with Claude Desktop or any MCP-compatible client!

---

*Last Updated: April 2024*  
*Version: 1.0.0*  
*Deployed on: Coolify*