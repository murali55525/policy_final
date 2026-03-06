#!/bin/bash
# ============================================================================
# Healthcare Platform - Complete Deployment Script for Minikube
# Deploys the entire stack: app, monitoring, security, and OPA policies
# ============================================================================
# Prerequisites:
#   - minikube installed and running
#   - kubectl configured
#   - Docker available (minikube docker-env)
# ============================================================================
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# STEP 1: Pre-flight checks
# ============================================================================
log_info "Running pre-flight checks..."

command -v minikube >/dev/null 2>&1 || { log_error "minikube not found. Install it first."; exit 1; }
command -v kubectl  >/dev/null 2>&1 || { log_error "kubectl not found. Install it first.";  exit 1; }
command -v docker   >/dev/null 2>&1 || { log_error "docker not found. Install it first.";   exit 1; }

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    log_warn "Minikube is not running. Starting minikube..."
    minikube start --cpus=4 --memory=8192 --driver=docker
fi

log_ok "Pre-flight checks passed"

# ============================================================================
# STEP 2: Configure Docker to use Minikube's daemon
# ============================================================================
log_info "Configuring Docker to use Minikube's daemon..."
eval $(minikube docker-env)
log_ok "Docker configured for Minikube"

# ============================================================================
# STEP 3: Build Docker images
# ============================================================================
log_info "Building Docker images..."

docker build -t healthcare-db:latest      ./database/
docker build -t healthcare-backend:latest ./backend/
docker build -t healthcare-frontend:latest ./frontend/
docker build -t ai-policy-engine:latest   ./ai-engine/

log_ok "All Docker images built successfully"

# ============================================================================
# STEP 4: Create Kubernetes namespaces
# ============================================================================
log_info "Creating Kubernetes namespaces..."
kubectl apply -f k8s/base/namespaces.yaml
log_ok "Namespaces created"

# ============================================================================
# STEP 5: Deploy Secrets and ConfigMaps
# ============================================================================
log_info "Deploying Secrets and ConfigMaps..."
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/configmap.yaml
log_ok "Secrets and ConfigMaps deployed"

# ============================================================================
# STEP 6: Deploy PostgreSQL database
# ============================================================================
log_info "Deploying PostgreSQL database..."
kubectl apply -f k8s/base/postgres-deployment.yaml
log_info "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n healthcare --timeout=120s
log_ok "PostgreSQL is ready"

# ============================================================================
# STEP 7: Deploy Backend API
# ============================================================================
log_info "Deploying Backend API..."
kubectl apply -f k8s/base/backend-deployment.yaml
log_info "Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n healthcare --timeout=120s
log_ok "Backend API is ready"

# ============================================================================
# STEP 8: Deploy AI Policy Engine
# ============================================================================
log_info "Deploying AI Policy Engine..."
kubectl apply -f k8s/base/ai-engine-deployment.yaml
log_info "Waiting for AI Engine to be ready..."
kubectl wait --for=condition=ready pod -l app=ai-engine -n healthcare --timeout=120s
log_ok "AI Policy Engine is ready"

# ============================================================================
# STEP 9: Deploy Frontend
# ============================================================================
log_info "Deploying Frontend..."
kubectl apply -f k8s/base/frontend-deployment.yaml
log_info "Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n healthcare --timeout=120s
log_ok "Frontend is ready"

# ============================================================================
# STEP 10: Apply Zero-Trust Network Policies
# ============================================================================
log_info "Applying zero-trust network policies..."
kubectl apply -f k8s/network-policies/
log_ok "Network policies applied"

# ============================================================================
# STEP 11: Deploy Monitoring Stack (Prometheus + Grafana)
# ============================================================================
log_info "Deploying monitoring stack..."
kubectl apply -f monitoring/monitoring-stack.yaml
log_info "Waiting for Prometheus..."
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=120s
log_info "Waiting for Grafana..."
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=120s
log_ok "Monitoring stack is ready"

# ============================================================================
# STEP 12: Deploy Falco Runtime Security
# ============================================================================
log_info "Deploying Falco runtime security..."
kubectl apply -f monitoring/falco/falco-deployment.yaml
log_ok "Falco deployed"

# ============================================================================
# STEP 13: Deploy OPA Gatekeeper Policies
# ============================================================================
log_info "Applying OPA Gatekeeper policies..."
# Check if Gatekeeper is installed
if kubectl get crd constrainttemplates.templates.gatekeeper.sh >/dev/null 2>&1; then
    kubectl apply -f opa/constraint-template.yaml
    sleep 5  # Wait for template to be ready
    kubectl apply -f opa/constraint.yaml
    log_ok "OPA Gatekeeper policies applied"
else
    log_warn "Gatekeeper CRDs not found. Install Gatekeeper first:"
    log_warn "  kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.14.0/deploy/gatekeeper.yaml"
    log_warn "  Then re-run this script to apply OPA policies."
fi

# ============================================================================
# STEP 14: Verify deployment
# ============================================================================
log_info "============================================"
log_info "Deployment verification:"
log_info "============================================"
echo ""
log_info "Healthcare namespace pods:"
kubectl get pods -n healthcare -o wide
echo ""
log_info "Monitoring namespace pods:"
kubectl get pods -n monitoring -o wide
echo ""
log_info "Security namespace pods:"
kubectl get pods -n security -o wide
echo ""
log_info "Services:"
kubectl get svc -n healthcare
echo ""
log_info "Network Policies:"
kubectl get networkpolicies -n healthcare

# ============================================================================
# STEP 15: Print access instructions
# ============================================================================
echo ""
echo "============================================"
log_ok "Deployment complete!"
echo "============================================"
echo ""
log_info "To access the services, run:"
echo ""
echo "  # Frontend Dashboard"
echo "  minikube service frontend -n healthcare"
echo ""
echo "  # Backend API (Swagger docs)"
echo "  minikube service backend -n healthcare"
echo "  # Then open /docs in browser"
echo ""
echo "  # Prometheus"
echo "  minikube service prometheus -n monitoring"
echo ""
echo "  # Grafana (admin/admin123)"
echo "  minikube service grafana -n monitoring"
echo ""
echo "  # Or use port-forwarding:"
echo "  kubectl port-forward svc/frontend 3000:80 -n healthcare"
echo "  kubectl port-forward svc/backend 8000:8000 -n healthcare"
echo "  kubectl port-forward svc/ai-engine 8001:8001 -n healthcare"
echo "  kubectl port-forward svc/prometheus 9090:9090 -n monitoring"
echo "  kubectl port-forward svc/grafana 3001:3000 -n monitoring"
echo ""
log_info "Test OPA policy rejection:"
echo "  kubectl apply -f opa/rejected-policy-example.yaml"
echo "  (Should be rejected by Gatekeeper)"
echo ""
