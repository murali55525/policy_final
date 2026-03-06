# Kubernetes Security Policy Generator

## 🛡️ Project Overview

**Automatically generate, enforce, and monitor Kubernetes security policies from simple service communication intent.**

### Key Features

1. **Intent-Based Policy Generation** - Define service communication rules in simple JSON, get production-ready Kubernetes NetworkPolicies automatically
2. **Automatic Enforcement** - Generated policies are deployed to your Kubernetes cluster to enforce zero-trust network security
3. **Real-Time Monitoring** - Continuous monitoring using Falco and Cilium Hubble to detect runtime security violations
4. **Drift Detection** - Identify unauthorized connections and policy violations as they happen
5. **Quantitative Risk Scoring** - Live security risk score dashboard with recommendations

### Tech Stack

- **Orchestration:** Kubernetes (Minikube), Docker
- **Backend:** Python (FastAPI), Kubernetes API
- **Security:** Kubernetes NetworkPolicy, Cilium, Falco
- **Monitoring:** Prometheus, Grafana
- **Frontend:** React, Material-UI, Recharts

---

## 📁 Project Structure

```
new_k8s/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # API endpoints
│   ├── policy_generator.py     # NetworkPolicy generation logic
│   ├── drift_detector.py       # Policy drift detection
│   ├── risk_scorer.py          # Security risk scoring
│   ├── kubernetes_client.py    # K8s cluster interaction
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile
│
├── frontend/                   # React Dashboard
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Dashboard pages
│   │   ├── services/           # API client
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
│
├── k8s/                        # Kubernetes Manifests
│   ├── example-intent.json     # Sample service intent
│   ├── demo-services.yaml      # Demo microservices
│   ├── backend-deployment.yaml # API deployment
│   ├── monitoring-stack.yaml   # Prometheus + Grafana
│   ├── grafana-dashboard.yaml  # Security dashboard
│   ├── falco-deployment.yaml   # Runtime security
│   └── cilium-hubble.yaml      # Network observability
│
├── monitoring/                 # Monitoring configs
│   ├── prometheus.yml
│   └── grafana/
│
├── scripts/                    # Setup scripts
│   ├── setup.sh
│   ├── setup.bat
│   └── deploy-minikube.sh
│
├── docker-compose.yml          # Local development
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Minikube (for local Kubernetes)
- kubectl
- Node.js 18+
- Python 3.11+

### Option 1: Docker Compose (Local Development)

```bash
# Clone and setup
git clone <repository>
cd new_k8s

# Start all services
docker-compose up -d

# Access:
# - Dashboard: http://localhost:3000
# - API: http://localhost:8000
# - Grafana: http://localhost:3001 (admin/admin123)
```

### Option 2: Minikube (Full Kubernetes)

```bash
# Start Minikube with Cilium
minikube start --cni=cilium --memory=4096

# Deploy everything
./scripts/deploy-minikube.sh

# Get service URLs
minikube service policy-generator-api --url
minikube service grafana --url -n monitoring
```

---

## 📖 Usage Guide

### 1. Define Service Communication Intent

Create an intent file describing which services can communicate:

```json
{
  "name": "my-app-intent",
  "namespace": "default",
  "rules": [
    {
      "from": "frontend",
      "to": "api-gateway",
      "ports": [80, 443]
    },
    {
      "from": "api-gateway",
      "to": "user-service",
      "ports": [8080]
    },
    {
      "from": "user-service",
      "to": "database",
      "ports": [5432]
    }
  ]
}
```

### 2. Generate NetworkPolicies

**Using the Dashboard:**

1. Open http://localhost:3000
2. Go to "Policy Generator"
3. Add your service rules
4. Click "Generate Policies"

**Using the API:**

```bash
curl -X POST http://localhost:8000/api/v1/policies/generate \
  -H "Content-Type: application/json" \
  -d @k8s/example-intent.json
```

### 3. Deploy Policies to Cluster

```bash
# Via Dashboard: Click "Deploy to Cluster"

# Via API:
curl -X POST http://localhost:8000/api/v1/policies/deploy \
  -H "Content-Type: application/json" \
  -d '{"policy_id": "abc123", "namespace": "default"}'
```

### 4. Monitor for Drift

- View real-time drift events in the Dashboard
- Check Grafana for security metrics
- Falco alerts for runtime violations

---

## 🔧 API Reference

### Generate Policies

```
POST /api/v1/policies/generate
```

### Deploy Policies

```
POST /api/v1/policies/deploy
```

### List Policies

```
GET /api/v1/policies
```

### Get Drift Events

```
GET /api/v1/drift/events?limit=100
```

### Get Risk Score

```
GET /api/v1/risk/score
```

### Get Metrics

```
GET /api/v1/metrics
```

---

## 📊 Dashboard Features

| Page                 | Description                                     |
| -------------------- | ----------------------------------------------- |
| **Dashboard**        | Overview with risk score, metrics, trend charts |
| **Policy Generator** | Visual editor for service intents               |
| **Drift Monitor**    | Real-time policy violation events               |
| **Risk Analysis**    | Detailed security posture breakdown             |
| **Policies**         | Manage generated policies                       |
| **Settings**         | Configure API and monitoring                    |

---

## 🔒 Security Features

### Network Policy Types Generated

1. **Default Deny** - Blocks all traffic by default
2. **Ingress Policies** - Allow specific incoming traffic
3. **Egress Policies** - Control outbound connections
4. **DNS Policies** - Allow service discovery

### Monitoring Capabilities

- **Cilium Hubble** - L3/L4/L7 network flow visibility
- **Falco** - Runtime security (syscalls, file access)
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards

---

## 🧪 Testing

### Deploy Demo Services

```bash
kubectl apply -f k8s/demo-services.yaml
```

### Simulate Drift Events

```bash
curl -X POST http://localhost:8000/api/v1/drift/simulate?count=20
```

### Test Policy Enforcement

```bash
# This should be blocked (no policy allows it)
kubectl exec -it frontend-pod -- curl backend:8080

# After applying policies, only allowed connections work
```

---

## 🛠️ Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

---

## 📦 Production Deployment

1. Use Helm charts for production deployments
2. Configure persistent storage for Prometheus/Grafana
3. Set up proper RBAC with least privilege
4. Use secrets management for sensitive data
5. Enable TLS for all services

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Acknowledgments

- Kubernetes NetworkPolicy documentation
- Cilium and Falco communities
- FastAPI and React communities
"# policy_final" 
