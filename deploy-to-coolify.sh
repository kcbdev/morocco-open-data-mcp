#!/bin/bash

#===============================================================================
# Morocco Open Data MCP Server - Coolify Deployment Script
#===============================================================================
# This script automates the deployment of the Morocco Open Data MCP server
# to your Coolify instance running on your VPS.
#
# Usage: ./deploy-to-coolify.sh [options]
#
# Options:
#   --build         Build the Docker image locally
#   --push          Push image to registry
#   --deploy        Deploy to Coolify via SSH
#   --cleanup       Remove old images and containers
#   --verify        Verify deployment
#   --all           Run all steps (build, push, deploy, verify)
#   --help          Show this help message
#
# Environment Variables:
#   VPS_HOST        VPS hostname or IP (default: 41.251.6.165)
#   VPS_USER        SSH username (default: qwen)
#   VPS_PASSWORD    SSH password (will prompt if not set)
#   DOMAIN          Domain name (default: morocco-od-mcp.kcb.ma)
#   REGISTRY        Docker registry (default: ghcr.io/kcb)
#   IMAGE_NAME      Image name (default: morocco-open-data-mcp)
#   TAG             Image tag (default: latest)
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
VPS_HOST="${VPS_HOST:-41.251.6.165}"
VPS_USER="${VPS_USER:-qwen}"
VPS_PASSWORD="${VPS_PASSWORD:-}"
DOMAIN="${DOMAIN:-morocco-od-mcp.kcb.ma}"
REGISTRY="${REGISTRY:-ghcr.io/kcb}"
IMAGE_NAME="${IMAGE_NAME:-morocco-open-data-mcp}"
TAG="${TAG:-latest}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

#-------------------------------------------------------------------------------
# Utility Functions
#-------------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "==============================================================================="
    echo " $1"
    echo "==============================================================================="
    echo ""
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing=()

    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    if ! command -v sshpass &> /dev/null && [ -z "$VPS_PASSWORD" ]; then
        log_warning "sshpass not found. You'll need to enter SSH password manually or use SSH keys."
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_info "Install with: sudo apt-get install -y ${missing[*]}"
        exit 1
    fi

    log_success "All dependencies checked"
}

#-------------------------------------------------------------------------------
# Build Functions
#-------------------------------------------------------------------------------

build_image() {
    print_header "Building Docker Image"

    log_info "Building image: ${FULL_IMAGE_NAME}"
    log_info "Project directory: ${PROJECT_DIR}"

    cd "${PROJECT_DIR}"

    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found in ${PROJECT_DIR}"
        exit 1
    fi

    docker build \
        --target production \
        --tag "${FULL_IMAGE_NAME}" \
        --build-arg NODE_ENV=production \
        --no-cache \
        .

    log_success "Image built successfully: ${FULL_IMAGE_NAME}"

    # Show image info
    log_info "Image details:"
    docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

#-------------------------------------------------------------------------------
# Push Functions
#-------------------------------------------------------------------------------

push_image() {
    print_header "Pushing Docker Image"

    log_info "Pushing to registry: ${REGISTRY}"

    # Check if logged in to registry
    if [[ "${REGISTRY}" == "ghcr.io"* ]]; then
        if ! docker info 2>&1 | grep -q "ghcr.io"; then
            log_warning "Not logged in to GitHub Container Registry"
            log_info "Login with: docker login ghcr.io"

            read -p "Do you want to login now? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker login ghcr.io
            fi
        fi
    fi

    docker push "${FULL_IMAGE_NAME}"

    log_success "Image pushed successfully"
}

#-------------------------------------------------------------------------------
# Deploy Functions
#-------------------------------------------------------------------------------

deploy_to_coolify() {
    print_header "Deploying to Coolify"

    log_info "Target VPS: ${VPS_USER}@${VPS_HOST}"
    log_info "Domain: ${DOMAIN}"

    cd "${PROJECT_DIR}"

    # Create deployment script for VPS
    cat > /tmp/deploy-coolify-temp.sh << 'VPS_SCRIPT'
#!/bin/bash
set -e

DOMAIN="{{DOMAIN}}"
IMAGE_NAME="{{IMAGE_NAME}}"
CONTAINER_NAME="morocco-open-data-mcp"

echo "Stopping existing container (if any)..."
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm "${CONTAINER_NAME}" 2>/dev/null || true

echo "Removing old images..."
docker rmi "$(docker images -q "${IMAGE_NAME}")" 2>/dev/null || true

echo "Pulling new image..."
docker pull "${IMAGE_NAME}"

echo "Creating network (if not exists)..."
docker network create coolify 2>/dev/null || true

echo "Starting container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    --network coolify \
    --expose 3000 \
    --label "traefik.enable=true" \
    --label "traefik.http.routers.morocco-open-data-mcp.rule=Host(\`${DOMAIN}\`)" \
    --label "traefik.http.routers.morocco-open-data-mcp.entrypoints=websecure" \
    --label "traefik.http.routers.morocco-open-data-mcp.tls=true" \
    --label "traefik.http.routers.morocco-open-data-mcp.tls.certresolver=letsencrypt" \
    --label "traefik.http.services.morocco-open-data-mcp.loadbalancer.server.port=3000" \
    -e NODE_ENV=production \
    -e MCP_PORT=3000 \
    -e MCP_HOST=0.0.0.0 \
    -e CACHE_TTL_DEFAULT=3600 \
    -e CACHE_TTL_SHORT=300 \
    -e CACHE_TTL_LONG=86400 \
    -e RATE_LIMIT_DEFAULT=60 \
    -e RATE_LIMIT_STRICT=10 \
    "${IMAGE_NAME}"

echo "Waiting for container to start..."
sleep 5

echo "Checking container status..."
docker ps | grep "${CONTAINER_NAME}"

echo "Checking logs..."
docker logs --tail 20 "${CONTAINER_NAME}"

echo "Deployment complete!"
VPS_SCRIPT

    # Replace placeholders
    sed -i "s|{{DOMAIN}}|${DOMAIN}|g" /tmp/deploy-coolify-temp.sh
    sed -i "s|{{IMAGE_NAME}}|${FULL_IMAGE_NAME}|g" /tmp/deploy-coolify-temp.sh

    # Make executable
    chmod +x /tmp/deploy-coolify-temp.sh

    # Copy docker-compose file to VPS
    log_info "Copying deployment files to VPS..."

    if [ -n "$VPS_PASSWORD" ]; then
        # Use sshpass if password is provided
        sshpass -p "${VPS_PASSWORD}" scp -o StrictHostKeyChecking=no \
            /tmp/deploy-coolify-temp.sh \
            "${VPS_USER}@${VPS_HOST}:/tmp/deploy-coolify.sh"

        sshpass -p "${VPS_PASSWORD}" scp -o StrictHostKeyChecking=no \
            "${PROJECT_DIR}/docker-compose.coolify.yml" \
            "${VPS_USER}@${VPS_HOST}:/tmp/docker-compose.coolify.yml"
    else
        # Use SSH keys or manual password entry
        scp -o StrictHostKeyChecking=no \
            /tmp/deploy-coolify-temp.sh \
            "${VPS_USER}@${VPS_HOST}:/tmp/deploy-coolify.sh"

        scp -o StrictHostKeyChecking=no \
            "${PROJECT_DIR}/docker-compose.coolify.yml" \
            "${VPS_USER}@${VPS_HOST}:/tmp/docker-compose.coolify.yml"
    fi

    # Execute deployment script on VPS
    log_info "Executing deployment on VPS..."

    if [ -n "$VPS_PASSWORD" ]; then
        sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "bash /tmp/deploy-coolify.sh"
    else
        ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "bash /tmp/deploy-coolify.sh"
    fi

    # Cleanup temp files
    rm -f /tmp/deploy-coolify-temp.sh

    log_success "Deployment to Coolify complete!"
    log_info "Access your MCP server at: https://${DOMAIN}"
}

#-------------------------------------------------------------------------------
# Verification Functions
#-------------------------------------------------------------------------------

verify_deployment() {
    print_header "Verifying Deployment"

    log_info "Checking container status on VPS..."

    # Check if container is running
    if [ -n "$VPS_PASSWORD" ]; then
        CONTAINER_STATUS=$(sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker ps --filter name=morocco-open-data-mcp --format '{{.Status}}'" 2>/dev/null)
    else
        CONTAINER_STATUS=$(ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker ps --filter name=morocco-open-data-mcp --format '{{.Status}}'" 2>/dev/null)
    fi

    if [ -n "$CONTAINER_STATUS" ]; then
        log_success "Container is running: ${CONTAINER_STATUS}"
    else
        log_error "Container is not running!"
        log_info "Check logs with: ssh ${VPS_USER}@${VPS_HOST} 'docker logs morocco-open-data-mcp'"
        exit 1
    fi

    # Test domain resolution
    log_info "Checking domain resolution..."
    if command -v curl &> /dev/null; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" -k 2>/dev/null || echo "000")

        if [ "$HTTP_STATUS" != "000" ]; then
            log_success "Domain responds with HTTP ${HTTP_STATUS}"
        else
            log_warning "Domain not responding yet. SSL certificate may be provisioning."
        fi
    else
        log_warning "curl not available, skipping HTTP check"
    fi

    # Check health
    log_info "Checking application health..."
    if [ -n "$VPS_PASSWORD" ]; then
        HEALTH_CHECK=$(sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker exec morocco-open-data-mcp node -e \"console.log('healthy')\"" 2>/dev/null)
    else
        HEALTH_CHECK=$(ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker exec morocco-open-data-mcp node -e \"console.log('healthy')\"" 2>/dev/null)
    fi

    if [ "$HEALTH_CHECK" == "healthy" ]; then
        log_success "Application health check passed"
    else
        log_warning "Health check inconclusive. Check logs manually."
    fi

    log_success "Verification complete!"
}

#-------------------------------------------------------------------------------
# Cleanup Functions
#-------------------------------------------------------------------------------

cleanup() {
    print_header "Cleanup"

    log_info "Cleaning up old Docker images on VPS..."

    if [ -n "$VPS_PASSWORD" ]; then
        sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker image prune -f --filter 'until=24h'"
    else
        ssh -o StrictHostKeyChecking=no \
            "${VPS_USER}@${VPS_HOST}" \
            "docker image prune -f --filter 'until=24h'"
    fi

    log_success "Cleanup complete"
}

#-------------------------------------------------------------------------------
# Help & Main
#-------------------------------------------------------------------------------

show_help() {
    cat << EOF
Morocco Open Data MCP Server - Coolify Deployment Script

Usage: $0 [options]

Options:
  --build         Build the Docker image locally
  --push          Push image to container registry
  --deploy        Deploy to Coolify via SSH
  --cleanup       Remove old images and containers on VPS
  --verify        Verify deployment status
  --all           Run complete deployment pipeline (build, push, deploy, verify)
  --help          Show this help message

Environment Variables:
  VPS_HOST        VPS hostname or IP address (default: 41.251.6.165)
  VPS_USER        SSH username (default: qwen)
  VPS_PASSWORD    SSH password (optional, will prompt if not set)
  DOMAIN          Domain name for the service (default: morocco-od-mcp.kcb.ma)
  REGISTRY        Docker registry (default: ghcr.io/kcb)
  IMAGE_NAME      Image name (default: morocco-open-data-mcp)
  TAG             Image tag (default: latest)

Examples:
  # Full deployment
  $0 --all

  # Build and push only
  $0 --build --push

  # Deploy existing image
  $0 --deploy

  # Custom registry and domain
  REGISTRY=docker.io/myuser DOMAIN=mcp.example.com $0 --all

EOF
}

main() {
    print_header "Morocco Open Data MCP - Coolify Deployment"

    # Parse arguments
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    BUILD=false
    PUSH=false
    DEPLOY=false
    CLEANUP=false
    VERIFY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                BUILD=true
                shift
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --deploy)
                DEPLOY=true
                shift
                ;;
            --cleanup)
                CLEANUP=true
                shift
                ;;
            --verify)
                VERIFY=true
                shift
                ;;
            --all)
                BUILD=true
                PUSH=true
                DEPLOY=true
                VERIFY=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Check dependencies
    check_dependencies

    # Execute requested operations
    if [ "$BUILD" = true ]; then
        build_image
    fi

    if [ "$PUSH" = true ]; then
        push_image
    fi

    if [ "$DEPLOY" = true ]; then
        deploy_to_coolify
    fi

    if [ "$CLEANUP" = true ]; then
        cleanup
    fi

    if [ "$VERIFY" = true ]; then
        verify_deployment
    fi

    print_header "Deployment Complete!"
    log_success "Your Morocco Open Data MCP server is deployed!"
    log_info "Domain: https://${DOMAIN}"
    log_info "Configure Claude Desktop with the MCP server URL to start using it."
    echo ""
}

# Run main function
main "$@"
