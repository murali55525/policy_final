@echo off
REM ============================================
REM Kubernetes Security Policy Generator Setup
REM ============================================

echo ========================================
echo K8s Security Policy Generator Setup
echo ========================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Minikube is installed
minikube version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Minikube is not installed. Install it for local K8s cluster.
    echo Download from: https://minikube.sigs.k8s.io/docs/start/
)

REM Check if kubectl is installed
kubectl version --client >nul 2>&1
if errorlevel 1 (
    echo WARNING: kubectl is not installed. Install it for K8s cluster management.
)

echo.
echo [1/5] Creating Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo [2/5] Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo [3/5] Building Docker images...
docker-compose build

echo.
echo [4/5] Starting services...
docker-compose up -d

echo.
echo [5/5] Waiting for services to start...
timeout /t 10

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Access the application at:
echo   - Dashboard: http://localhost:3000
echo   - API:       http://localhost:8000
echo   - Grafana:   http://localhost:3001 (admin/admin123)
echo   - Prometheus: http://localhost:9090
echo.
echo To start Minikube cluster:
echo   minikube start --cni=cilium
echo.
echo To deploy demo services:
echo   kubectl apply -f k8s/demo-services.yaml
echo.
