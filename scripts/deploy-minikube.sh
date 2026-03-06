#!/bin/bash

# ============================================
# Deploy Full Stack to Minikube
# ============================================

set -e

echo "========================================"
echo "Deploying to Minikube Cluster"
echo "========================================"

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo "Starting Minikube with Cilium CNI..."
    minikube start --cni=cilium --memory=4096 --cpus=2
fi

# Enable required addons
echo "[1/7] Enabling Minikube addons..."
minikube addons enable metrics-server
minikube addons enable dashboard

# Build images in Minikube context
echo "[2/7] Building Docker images in Minikube..."
eval $(minikube docker-env)
docker build -t policy-generator-api:latest ./backend
docker build -t security-dashboard:latest ./frontend

# Create namespaces
echo "[3/7] Creating namespaces..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: falco
---
apiVersion: v1
kind: Namespace
metadata:
  name: demo
EOF

# Deploy monitoring stack
echo "[4/7] Deploying monitoring stack..."
kubectl apply -f k8s/monitoring-stack.yaml
kubectl apply -f k8s/grafana-dashboard.yaml

# Deploy Falco
echo "[5/7] Deploying Falco..."
kubectl apply -f k8s/falco-deployment.yaml

# Deploy backend API
echo "[6/7] Deploying Policy Generator API..."
kubectl apply -f k8s/backend-deployment.yaml

# Deploy demo services
echo "[7/7] Deploying demo microservices..."
kubectl apply -f k8s/demo-services.yaml

# Wait for deployments
echo ""
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/policy-generator-api -n default
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

# Get service URLs
echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Access the services:"
echo ""
echo "Policy Generator API:"
minikube service policy-generator-api --url -n default
echo ""
echo "Grafana Dashboard:"
minikube service grafana --url -n monitoring
echo ""
echo "Prometheus:"
minikube service prometheus --url -n monitoring
echo ""
echo "To open the Kubernetes dashboard:"
echo "  minikube dashboard"
echo ""
