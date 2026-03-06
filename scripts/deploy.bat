@echo off
REM ============================================================================
REM Healthcare Platform - Deployment Script for Windows (Minikube)
REM ============================================================================
REM Prerequisites: minikube, kubectl, Docker Desktop
REM Usage: scripts\deploy.bat
REM ============================================================================

echo [INFO] Healthcare Platform Deployment
echo ============================================

REM Step 1: Check prerequisites
echo [INFO] Checking prerequisites...
where minikube >nul 2>&1 || (echo [ERROR] minikube not found & exit /b 1)
where kubectl >nul 2>&1 || (echo [ERROR] kubectl not found & exit /b 1)
where docker >nul 2>&1 || (echo [ERROR] docker not found & exit /b 1)
echo [OK] Prerequisites found

REM Step 2: Start minikube if not running
echo [INFO] Checking minikube status...
minikube status >nul 2>&1 || (
    echo [INFO] Starting minikube...
    minikube start --cpus=4 --memory=8192 --driver=docker
)

REM Step 3: Configure Docker for Minikube
echo [INFO] Configuring Docker for Minikube...
@FOR /f "tokens=*" %%i IN ('minikube docker-env --shell cmd') DO @%%i

REM Step 4: Build Docker images
echo [INFO] Building Docker images...
docker build -t healthcare-db:latest database\
docker build -t healthcare-backend:latest backend\
docker build -t healthcare-frontend:latest frontend\
docker build -t ai-policy-engine:latest ai-engine\
echo [OK] Docker images built

REM Step 5: Create namespaces
echo [INFO] Creating namespaces...
kubectl apply -f k8s\base\namespaces.yaml

REM Step 6: Deploy secrets and configmaps
echo [INFO] Deploying secrets and configmaps...
kubectl apply -f k8s\base\secrets.yaml
kubectl apply -f k8s\base\configmap.yaml

REM Step 7: Deploy database
echo [INFO] Deploying PostgreSQL...
kubectl apply -f k8s\base\postgres-deployment.yaml
echo [INFO] Waiting for PostgreSQL...
kubectl wait --for=condition=ready pod -l app=postgres -n healthcare --timeout=120s

REM Step 8: Deploy backend
echo [INFO] Deploying Backend API...
kubectl apply -f k8s\base\backend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=backend -n healthcare --timeout=120s

REM Step 9: Deploy AI engine
echo [INFO] Deploying AI Policy Engine...
kubectl apply -f k8s\base\ai-engine-deployment.yaml
kubectl wait --for=condition=ready pod -l app=ai-engine -n healthcare --timeout=120s

REM Step 10: Deploy frontend
echo [INFO] Deploying Frontend...
kubectl apply -f k8s\base\frontend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=frontend -n healthcare --timeout=120s

REM Step 11: Apply network policies
echo [INFO] Applying network policies...
kubectl apply -f k8s\network-policies\

REM Step 12: Deploy monitoring
echo [INFO] Deploying monitoring stack...
kubectl apply -f monitoring\monitoring-stack.yaml

REM Step 13: Deploy Falco
echo [INFO] Deploying Falco...
kubectl apply -f monitoring\falco\falco-deployment.yaml

REM Step 14: Show status
echo.
echo ============================================
echo [OK] Deployment complete!
echo ============================================
echo.
kubectl get pods -n healthcare
echo.
kubectl get pods -n monitoring
echo.
kubectl get svc -n healthcare
echo.
echo Access services:
echo   minikube service frontend -n healthcare
echo   minikube service backend -n healthcare
echo   minikube service grafana -n monitoring
echo.
echo Or use docker-compose for local development:
echo   docker-compose up --build
echo.
