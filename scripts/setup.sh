#!/bin/bash

# ============================================
# Kubernetes Security Policy Generator Setup
# ============================================

set -e

echo "========================================"
echo "K8s Security Policy Generator Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo -e "${YELLOW}WARNING: Minikube is not installed. Install it for local K8s cluster.${NC}"
    echo "Download from: https://minikube.sigs.k8s.io/docs/start/"
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}WARNING: kubectl is not installed. Install it for K8s cluster management.${NC}"
fi

echo ""
echo "[1/5] Creating Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "[2/5] Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "[3/5] Building Docker images..."
docker-compose build

echo ""
echo "[4/5] Starting services..."
docker-compose up -d

echo ""
echo "[5/5] Waiting for services to start..."
sleep 10

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Access the application at:"
echo "  - Dashboard:  http://localhost:3000"
echo "  - API:        http://localhost:8000"
echo "  - Grafana:    http://localhost:3001 (admin/admin123)"
echo "  - Prometheus: http://localhost:9090"
echo ""
echo "To start Minikube cluster:"
echo "  minikube start --cni=cilium"
echo ""
echo "To deploy demo services:"
echo "  kubectl apply -f k8s/demo-services.yaml"
echo ""
