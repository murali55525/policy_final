# AI-Driven Kubernetes Security Policy Copilot with Secure Healthcare Platform

## Project Overview

A production-grade, end-to-end DevSecOps platform that combines a **Kubernetes-based healthcare microservices application** with an **AI-powered security policy engine**. The system automatically generates, validates, enforces, and monitors Kubernetes security policies using intent-based networking, OPA Gatekeeper admission control, runtime security monitoring with Falco, and real-time drift detection.

This project demonstrates real-world applicability across cloud-native security, healthcare data protection (HIPAA-aligned), and AI-driven policy automation.

---

## Architecture

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        KUBERNETES CLUSTER                         |
|                                                                   |
|  +-- healthcare namespace ----+   +-- monitoring namespace ----+  |
|  |                            |   |                            |  |
|  |  +----------+  +--------+ |   |  +------------+            |  |
|  |  | Frontend |->| Backend| |   |  | Prometheus |            |  |
|  |  | (React)  |  | (Fast  | |   |  | (metrics)  |            |  |
|  |  | Port 80  |  |  API)  | |   |  +------+-----+            |  |
|  |  +----------+  | Port   | |   |         |                  |  |
|  |                | 8000   | |   |  +------v-----+            |  |
|  |                +---+----+ |   |  |  Grafana   |            |  |
|  |                    |      |   |  | (dashboards)|           |  |
|  |                    v      |   |  +------------+            |  |
|  |              +-----------+|   +----------------------------+  |
|  |              | PostgreSQL||                                   |
|  |              | Port 5432 ||   +-- security namespace ------+  |
|  |              +-----------+|   |                            |  |
|  |                    ^      |   |  +---------+  +----------+ |  |
|  |                    |      |   |  |  Falco  |  |   OPA    | |  |
|  |              +-----+----+ |   |  |(DaemonS)|  |Gatekeeper| |  |
|  |              |AI Engine | |   |  +---------+  +----------+ |  |
|  |              |Port 8001 | |   +----------------------------+  |
|  |              +----------+ |                                   |
|  +---------------------------+                                   |
|                                                                   |
|  +-- Network Policies (Zero-Trust) --+                           |
|  | Default Deny All                  |                           |
|  | Frontend -> Backend (TCP:8000)    |                           |
|  | Backend  -> Postgres (TCP:5432)   |                           |
|  | Backend  -> AI Engine (TCP:8001)  |                           |
|  | All Pods -> DNS (UDP/TCP:53)      |                           |
|  +-----------------------------------+                           |
+------------------------------------------------------------------+
```

### Data Flow

1. **User** accesses the **Frontend** (React dashboard on port 80)
2. **Frontend** sends API requests to **Backend** (FastAPI on port 8000)
3. **Backend** persists data in **PostgreSQL** (port 5432)
4. **Backend** calls **AI Engine** (port 8001) for policy generation and risk scoring
5. **Prometheus** scrapes metrics from Backend and AI Engine
6. **Grafana** visualizes metrics from Prometheus
7. **Falco** monitors container syscalls for runtime threats
8. **OPA Gatekeeper** validates policies at admission time
9. **NetworkPolicies** enforce zero-trust pod-to-pod communication

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Orchestration | Kubernetes (Minikube), Docker | Container orchestration |
| Backend API | FastAPI 0.109, Python 3.11 | REST API with async support |
| Database | PostgreSQL 15, asyncpg | ACID-compliant data persistence |
| Frontend | React 18.2, Material-UI 5.15 | Responsive dashboard UI |
| AI Engine | FastAPI, Python | Policy generation & risk analysis |
| Network Security | Kubernetes NetworkPolicy | Zero-trust networking |
| Admission Control | OPA Gatekeeper 3.15 | Policy validation at deploy time |
| Runtime Security | Falco 0.37 | Syscall monitoring & alerting |
| Monitoring | Prometheus 2.48, Grafana 10.2 | Metrics collection & visualization |
| Containerization | Docker, Alpine images | Minimal production images |

---

## Complete Folder Structure

```
new_k8s/
|
|-- frontend/                         # React Frontend Application
|   |-- public/
|   |   |-- index.html                # HTML entry point
|   |-- src/
|   |   |-- components/
|   |   |   |-- Sidebar.js            # Navigation sidebar (8 menu items)
|   |   |-- pages/
|   |   |   |-- Dashboard.js          # Overview dashboard with metrics
|   |   |   |-- Patients.js           # Patient management (CRUD + DataGrid)
|   |   |   |-- Appointments.js       # Appointment scheduling (CRUD)
|   |   |   |-- SecurityDashboard.js  # Security posture overview
|   |   |   |-- PolicyGenerator.js    # AI policy generation UI
|   |   |   |-- DriftMonitor.js       # Real-time drift event viewer
|   |   |   |-- RiskAnalysis.js       # Risk score breakdown
|   |   |   |-- Settings.js           # Configuration page
|   |   |   |-- Policies.js           # Policy list management
|   |   |-- services/
|   |   |   |-- api.js                # Axios API client (20+ endpoints)
|   |   |-- App.js                    # Router with 8 routes + dark theme
|   |-- package.json                  # Dependencies (React, MUI, Recharts)
|   |-- nginx.conf                    # Nginx reverse proxy config
|   |-- Dockerfile                    # Multi-stage build (Node -> Nginx)
|   |-- .env                          # Environment variables
|
|-- backend/                          # FastAPI Backend API
|   |-- main.py                       # 20+ REST endpoints (patients, appointments,
|   |                                 #   policies, drift, risk, metrics, health)
|   |-- models.py                     # Pydantic validation models
|   |-- database.py                   # Async PostgreSQL connection pool
|   |-- config.py                     # Environment-based configuration
|   |-- policy_generator.py           # NetworkPolicy generation from intent
|   |-- drift_detector.py             # Policy drift detection engine
|   |-- risk_scorer.py                # Service risk scoring (0-100)
|   |-- kubernetes_client.py          # Kubernetes API interaction
|   |-- requirements.txt              # Python dependencies
|   |-- Dockerfile                    # Production image with non-root user
|
|-- ai-engine/                        # AI Policy Engine Service
|   |-- main.py                       # FastAPI with policy/RBAC/drift/risk endpoints
|   |-- policy_generator.py           # Core policy generation logic
|   |-- drift_detector.py             # Policy comparison and drift analysis
|   |-- risk_scorer.py                # Weighted risk calculation engine
|   |-- requirements.txt              # Python dependencies
|   |-- Dockerfile                    # Production container image
|
|-- database/                         # PostgreSQL Database
|   |-- init.sql                      # Schema: patients, appointments, audit_logs,
|   |                                 #   security_events + indexes + triggers + seed data
|   |-- Dockerfile                    # PostgreSQL 15 Alpine with init script
|
|-- k8s/                              # Kubernetes Manifests
|   |-- base/
|   |   |-- namespaces.yaml           # healthcare, monitoring, security namespaces
|   |   |-- secrets.yaml              # Base64-encoded database credentials
|   |   |-- configmap.yaml            # Non-sensitive app configuration
|   |   |-- postgres-deployment.yaml  # PostgreSQL Deployment + PV + PVC + Service
|   |   |-- backend-deployment.yaml   # Backend Deployment (2 replicas) + Service
|   |   |-- frontend-deployment.yaml  # Frontend Deployment (2 replicas) + Service
|   |   |-- ai-engine-deployment.yaml # AI Engine Deployment + Service
|   |-- network-policies/
|   |   |-- default-deny.yaml         # Zero-trust: deny all ingress + egress
|   |   |-- allow-frontend-to-backend.yaml  # Frontend -> Backend (TCP:8000)
|   |   |-- allow-backend-to-postgres.yaml  # Backend -> Postgres (TCP:5432)
|   |   |-- allow-backend-to-ai-engine.yaml # Backend -> AI Engine (TCP:8001)
|   |   |-- allow-dns.yaml            # All pods -> kube-dns (UDP/TCP:53)
|   |   |-- deny-all-example.yaml     # Example restrictive policy
|   |-- monitoring-stack.yaml         # Prometheus + Grafana Deployments + RBAC
|   |-- grafana-dashboard.yaml        # Security dashboard ConfigMap
|   |-- falco-deployment.yaml         # Falco DaemonSet + RBAC
|   |-- cilium-hubble.yaml            # Cilium Hubble network visibility
|   |-- example-intent.json           # Sample intent for policy generation
|   |-- demo-services.yaml            # Demo microservices for testing
|
|-- opa/                              # OPA Gatekeeper Policies
|   |-- gatekeeper-install.yaml       # Gatekeeper namespace + install docs
|   |-- constraint-template.yaml      # ConstraintTemplate (Rego policy logic)
|   |-- constraint.yaml               # Constraint: block allow-all policies
|   |-- validate-policy.rego          # Standalone Rego validation rules
|   |-- rejected-policy-example.yaml  # Example that will be REJECTED by Gatekeeper
|
|-- monitoring/                       # Monitoring Configuration
|   |-- prometheus.yml                # Prometheus scrape config
|   |-- alert_rules.yml              # Alert rules (risk, drift, errors, latency)
|   |-- falco/
|   |   |-- falco_rules.yaml          # 8 Falco rules for healthcare security
|   |   |-- falco-deployment.yaml     # Falco DaemonSet + RBAC + ConfigMap
|   |-- grafana/
|   |   |-- provisioning/
|   |   |   |-- datasources/
|   |   |   |   |-- datasources.yaml  # Prometheus datasource
|   |   |   |-- dashboards/
|   |   |       |-- dashboards.yaml   # Dashboard file provisioner
|   |   |-- dashboards/
|   |       |-- security-dashboard.json # Pre-built Grafana dashboard (12 panels)
|
|-- scripts/                          # Automation Scripts
|   |-- setup.sh                      # Linux/macOS setup
|   |-- setup.bat                     # Windows setup
|   |-- deploy.sh                     # Linux/macOS Kubernetes deployment
|   |-- deploy.bat                    # Windows Kubernetes deployment
|   |-- deploy-minikube.sh            # Minikube-specific deployment
|
|-- docker-compose.yml                # Full local dev stack (all 6 services)
|-- .gitignore                        # Git ignore rules
|-- README.md                         # This file
```

---

## 1. Application Layer

### Backend (FastAPI REST API)

The backend API (`backend/main.py`) exposes 20+ endpoints organized into modules:

**Healthcare Endpoints:**
- `GET /api/v1/patients` - List patients with search and pagination
- `POST /api/v1/patients` - Create patient with Pydantic validation
- `GET /api/v1/patients/{id}` - Get patient by UUID
- `PUT /api/v1/patients/{id}` - Update patient record
- `DELETE /api/v1/patients/{id}` - Soft-delete patient

- `GET /api/v1/appointments` - List appointments with filters
- `POST /api/v1/appointments` - Schedule appointment
- `PUT /api/v1/appointments/{id}` - Update appointment
- `PATCH /api/v1/appointments/{id}/cancel` - Cancel appointment

**Security Endpoints:**
- `POST /api/v1/policies/generate` - Generate NetworkPolicies from intent
- `GET /api/v1/policies` - List generated policies
- `POST /api/v1/policies/deploy` - Deploy policies to cluster
- `GET /api/v1/drift/events` - Get drift events
- `POST /api/v1/drift/analyze` - Trigger drift analysis
- `GET /api/v1/risk/score` - Get overall risk score
- `GET /api/v1/risk/breakdown` - Get per-service risk breakdown

**Infrastructure Endpoints:**
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe
- `GET /api/v1/metrics` - Prometheus metrics

### Frontend (React Dashboard)

8 pages accessible via the sidebar navigation:

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview with summary cards, charts, risk gauge |
| Patients | `/patients` | DataGrid with CRUD, search, form validation |
| Appointments | `/appointments` | Scheduling with status tracking and filters |
| Security | `/security` | Risk scores, drift events, pod communication map |
| Policy Generator | `/policies` | Define intents and generate policies visually |
| Drift Monitor | `/drift` | Real-time policy violation event stream |
| Risk Analysis | `/risk` | Weighted risk breakdown per service |
| Settings | `/settings` | API configuration and preferences |

### Database (PostgreSQL 15)

Schema in `database/init.sql`:
- **patients** - Demographics, medical history, allergies, emergency contacts
- **appointments** - Scheduling with FK to patients, status tracking
- **audit_logs** - HIPAA-compliant immutable audit trail
- **security_events** - Policy violations and drift events
- Indexes on all frequently queried columns
- Auto-update triggers for `updated_at` timestamps
- Seed data with 3 sample patients and appointments

---

## 2. Kubernetes Deployment

### Namespace Separation

Three namespaces isolate workloads (`k8s/base/namespaces.yaml`):

```yaml
healthcare   # Application workloads (frontend, backend, DB, AI engine)
monitoring   # Prometheus, Grafana
security     # Falco, OPA Gatekeeper
```

### Deployments and Services

Each service is deployed with production best practices:

| Service | Replicas | Type | Port | Probes | Resource Limits |
|---------|----------|------|------|--------|-----------------|
| Frontend | 2 | ClusterIP | 80 | HTTP liveness + readiness | 128Mi / 100m |
| Backend | 2 | ClusterIP | 8000 | HTTP `/health` + `/ready` | 256Mi / 200m |
| PostgreSQL | 1 | ClusterIP | 5432 | `pg_isready` exec probe | 256Mi / 250m |
| AI Engine | 1 | ClusterIP | 8001 | HTTP `/health` + `/ready` | 256Mi / 200m |

### Persistent Storage

PostgreSQL uses a PersistentVolume + PersistentVolumeClaim:
- **PV**: 1Gi hostPath (Minikube-compatible)
- **PVC**: Bound to healthcare namespace
- **Reclaim Policy**: Retain (data survives pod restarts)

### ConfigMaps and Secrets

**ConfigMap** (`k8s/base/configmap.yaml`):
- Database host, port, database name
- AI Engine URL
- CORS allowed origins
- Log level

**Secret** (`k8s/base/secrets.yaml`):
- `DB_USER` (base64-encoded)
- `DB_PASSWORD` (base64-encoded)
- `POSTGRES_PASSWORD` (base64-encoded)

---

## 3. Zero-Trust Networking

### Network Policy Architecture

```
Default: DENY ALL ingress + egress (default-deny.yaml)
    |
    +-- Allow: Frontend -> Backend (TCP:8000)
    +-- Allow: Backend -> PostgreSQL (TCP:5432)
    +-- Allow: Backend -> AI Engine (TCP:8001)
    +-- Allow: All Pods -> kube-dns (UDP/TCP:53)
```

Each allow policy is implemented as **two rules** (egress from source + ingress to destination) to work correctly with bidirectional default-deny:

- `default-deny.yaml` - Blocks ALL ingress and egress for all pods
- `allow-frontend-to-backend.yaml` - Frontend egress + Backend ingress on TCP:8000
- `allow-backend-to-postgres.yaml` - Backend egress + Postgres ingress on TCP:5432
- `allow-backend-to-ai-engine.yaml` - Backend egress + AI Engine ingress on TCP:8001
- `allow-dns.yaml` - All pods egress to kube-system on UDP/TCP:53

**Any traffic not explicitly allowed is denied.** For example, Frontend cannot reach PostgreSQL directly.

---

## 4. AI Policy Engine

The AI Engine (`ai-engine/`) is a standalone FastAPI service that provides intelligent security policy management:

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/generate-policy` | POST | Generate NetworkPolicies from JSON intent |
| `/api/v1/generate-rbac` | POST | Generate RBAC roles and bindings |
| `/api/v1/validate-policy` | POST | Validate policy against best practices |
| `/api/v1/policy-history` | GET | Audit trail of generated policies |
| `/api/v1/drift/detect` | POST | Compare intended vs actual policies |
| `/api/v1/risk/scores` | GET | Per-service risk scores |
| `/metrics` | GET | Prometheus metrics endpoint |

### Intent Format

```json
{
  "name": "healthcare-app-intent",
  "namespace": "healthcare",
  "rules": [
    {
      "from": "frontend",
      "to": "backend",
      "ports": [8000],
      "protocol": "TCP"
    },
    {
      "from": "backend",
      "to": "postgres",
      "ports": [5432],
      "protocol": "TCP"
    }
  ]
}
```

### Generated Output

From the intent above, the engine generates:
1. **Default-deny** NetworkPolicy for the namespace
2. **Ingress** rules for each destination service
3. **Egress** rules for each source service
4. **DNS egress** policy for all pods
5. **RBAC** roles with least-privilege access
6. Policy stored in history with timestamp and metadata

---

## 5. OPA + Gatekeeper

### How It Works

OPA Gatekeeper acts as a Kubernetes admission webhook that intercepts every API request and validates it against defined policies before allowing the resource to be created.

### Files

1. **`opa/constraint-template.yaml`** - Defines the Rego policy logic:
   - Checks for empty ingress rules (`ingress: [{}]`)
   - Checks for missing `from` fields in ingress rules
   - Checks for empty podSelector on permissive policies
   - Generates descriptive violation messages

2. **`opa/constraint.yaml`** - Activates the constraint:
   - Targets `NetworkPolicy` resources in `networking.k8s.io` API group
   - Enforcement action: `deny` (blocks violating resources)
   - Excludes `kube-system` and `gatekeeper-system` namespaces

3. **`opa/validate-policy.rego`** - Standalone Rego validation rules

4. **`opa/rejected-policy-example.yaml`** - Demonstrates a policy that **will be rejected** by Gatekeeper:

### Rejection Example

Applying this insecure NetworkPolicy will be blocked:

```yaml
# This will be REJECTED by Gatekeeper
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-traffic
  namespace: healthcare
spec:
  podSelector: {}      # Matches ALL pods
  ingress:
    - {}                # Allows ALL inbound traffic
  policyTypes:
    - Ingress
```

**Expected error:**
```
Error from server (Forbidden): admission webhook "validation.gatekeeper.sh" denied
the request: [block-allow-all-network-policies] DENIED: NetworkPolicy
'allow-all-traffic' in namespace 'healthcare' contains an empty ingress rule
which allows all inbound traffic.
```

### Deployment

```bash
# 1. Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/deploy/gatekeeper.yaml

# 2. Wait for pods
kubectl wait --for=condition=Ready pod -l control-plane=controller-manager \
  -n gatekeeper-system --timeout=120s

# 3. Apply ConstraintTemplate
kubectl apply -f opa/constraint-template.yaml
sleep 10

# 4. Apply Constraint
kubectl apply -f opa/constraint.yaml

# 5. Test rejection
kubectl apply -f opa/rejected-policy-example.yaml
# Expected: admission webhook denies the request
```

---

## 6. Policy Drift Detection

The drift detection system (`backend/drift_detector.py`, `ai-engine/drift_detector.py`) continuously compares the **intended** policy state against the **actual** cluster state.

### How It Works

1. **Intended State**: Stored from the original JSON intent used to generate policies
2. **Actual State**: Queried from the Kubernetes API at runtime
3. **Comparison**: Detects differences in selectors, ports, protocols, or missing policies
4. **Alert Generation**: Creates `DriftEvent` records with severity (info/low/medium/high/critical)

### Drift Types Detected

| Type | Severity | Description |
|------|----------|-------------|
| `policy_modified` | High | NetworkPolicy spec changed outside of intent |
| `policy_deleted` | Critical | Expected policy no longer exists |
| `unauthorized_flow` | High | Traffic flow not in any intent |
| `new_policy` | Medium | Unrecognized policy appeared |
| `selector_mismatch` | Medium | Pod selector differs from intent |

### API Endpoints

```bash
# Trigger drift analysis
curl -X POST http://localhost:8000/api/v1/drift/analyze

# Get drift events
curl http://localhost:8000/api/v1/drift/events?limit=50

# Simulate drift events for testing
curl -X POST http://localhost:8000/api/v1/drift/simulate?count=10
```

---

## 7. Risk Scoring System

Each service receives a risk score from 0 (secure) to 100 (critical) based on weighted factors:

### Risk Factors and Weights

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Drift Events | 30% | Number of policy drift events for the service |
| Policy Coverage | 25% | Percentage of ports/protocols covered by policies |
| Configuration | 20% | Security settings (non-root, read-only, no privileged) |
| Compliance | 15% | HIPAA/regulatory requirement adherence |
| Runtime Behavior | 10% | Falco alerts and suspicious activity |

### Risk Levels

| Score Range | Level | Color |
|------------|-------|-------|
| 0 - 20 | Low | Green |
| 21 - 50 | Medium | Yellow |
| 51 - 75 | High | Orange |
| 76 - 100 | Critical | Red |

### Prometheus Metrics Exposed

```
service_risk_score{service="backend"} 38
service_risk_score{service="frontend"} 15
service_risk_score{service="postgres"} 12
policy_drift_events_total 5
security_events_total{severity="high"} 2
policies_generated_total 12
```

---

## 8. Monitoring and Observability

### Prometheus

- Deployed in `monitoring` namespace with ServiceAccount + ClusterRole + ClusterRoleBinding
- Scrapes: Kubernetes API servers, nodes, pods (with annotation `prometheus.io/scrape: "true"`), backend, AI engine, Falco
- Alert rules in `monitoring/alert_rules.yml`:
  - `HighRiskScore` - Service risk > 70 for 5 minutes
  - `PolicyDriftDetected` - Any drift events in 5 minutes
  - `SecurityEventSpike` - Security events > 1/sec for 2 minutes
  - `HighErrorRate` - API error rate > 5%
  - `HighLatency` - p95 latency > 2 seconds
  - `DatabaseConnectionFailure` - Backend not responding

### Grafana Dashboard

Pre-configured dashboard (`monitoring/grafana/dashboards/security-dashboard.json`) with 12 panels:

1. **Overall Risk Score** (gauge, 0-100 with color thresholds)
2. **Policy Drift Events** (stat, last hour)
3. **Security Events by Severity** (pie chart)
4. **Active Policies** (stat counter)
5. **Risk Score per Service** (time series)
6. **API Request Rate** (time series by method/endpoint)
7. **API Latency p95/p50** (time series)
8. **Database Queries** (time series by operation)
9. **Patient/Appointment Counts** (stat)
10. **Active Connections** (gauge)

Access: `http://localhost:3001` (admin / admin123)

---

## 9. Runtime Security (Falco)

Deployed as a DaemonSet in the `security` namespace with 8 custom rules for healthcare:

| Rule | Priority | What It Detects |
|------|----------|----------------|
| Shell Spawned in Healthcare Container | WARNING | bash/sh/zsh execution in pods |
| Unexpected Process in Database Container | CRITICAL | Non-postgres processes in DB |
| Sensitive File Access | WARNING | Reads to /etc/shadow, /etc/passwd, SSH keys |
| Network Scanning Tool | WARNING | nmap, netcat, tcpdump usage |
| Privilege Escalation | CRITICAL | sudo, su, chmod +s attempts |
| Write to System Directory | CRITICAL | Writes to /bin, /sbin, /usr/bin |
| Outbound to Unusual Port | WARNING | Connections to non-standard ports |
| Environment Variable Credential Access | WARNING | Reading /proc/*/environ |

---

## Deployment Steps

### Option 1: Docker Compose (Local Development)

```bash
# Clone the repository
git clone <repository-url>
cd new_k8s

# Build and start all services
docker-compose up --build -d

# Verify all services are running
docker-compose ps

# Access the application
# Dashboard:  http://localhost:3000
# Backend:    http://localhost:8000
# API Docs:   http://localhost:8000/docs
# AI Engine:  http://localhost:8001
# Grafana:    http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
```

### Option 2: Minikube (Full Kubernetes Deployment)

```bash
# 1. Start Minikube with sufficient resources
minikube start --cpus=4 --memory=8192 --driver=docker

# 2. Configure Docker to use Minikube's daemon
eval $(minikube docker-env)          # Linux/macOS
# OR: minikube docker-env | Invoke-Expression  # PowerShell

# 3. Build Docker images inside Minikube
docker build -t healthcare-db:latest database/
docker build -t healthcare-backend:latest backend/
docker build -t healthcare-frontend:latest frontend/
docker build -t healthcare-ai-engine:latest ai-engine/

# 4. Create namespaces
kubectl apply -f k8s/base/namespaces.yaml

# 5. Deploy secrets and configmaps
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/configmap.yaml

# 6. Deploy PostgreSQL (wait for it to be ready)
kubectl apply -f k8s/base/postgres-deployment.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n healthcare --timeout=120s

# 7. Deploy backend
kubectl apply -f k8s/base/backend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=backend -n healthcare --timeout=120s

# 8. Deploy AI engine
kubectl apply -f k8s/base/ai-engine-deployment.yaml
kubectl wait --for=condition=ready pod -l app=ai-engine -n healthcare --timeout=120s

# 9. Deploy frontend
kubectl apply -f k8s/base/frontend-deployment.yaml
kubectl wait --for=condition=ready pod -l app=frontend -n healthcare --timeout=120s

# 10. Apply zero-trust network policies
kubectl apply -f k8s/network-policies/

# 11. Deploy monitoring stack
kubectl apply -f k8s/monitoring-stack.yaml

# 12. Deploy Falco runtime security
kubectl apply -f monitoring/falco/falco-deployment.yaml

# 13. Install OPA Gatekeeper (optional)
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/deploy/gatekeeper.yaml
kubectl wait --for=condition=Ready pod -l control-plane=controller-manager \
  -n gatekeeper-system --timeout=120s
kubectl apply -f opa/constraint-template.yaml
sleep 10
kubectl apply -f opa/constraint.yaml

# 14. Verify deployment
kubectl get pods -n healthcare
kubectl get pods -n monitoring
kubectl get pods -n security
kubectl get networkpolicies -n healthcare

# 15. Access services
minikube service frontend -n healthcare
minikube service grafana -n monitoring
```

### Windows Quick Deploy

```cmd
scripts\deploy.bat
```

---

## Testing Steps

### 1. Verify Pod Health

```bash
kubectl get pods -n healthcare -o wide
# All pods should show Running with READY 1/1 or 2/2
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Create a patient
curl -X POST http://localhost:8000/api/v1/patients \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "email": "test@example.com"
  }'

# List patients
curl http://localhost:8000/api/v1/patients

# Create appointment
curl -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "<UUID-from-above>",
    "doctor_name": "Dr. Smith",
    "department": "Cardiology",
    "appointment_date": "2025-03-15T10:00:00",
    "reason": "Annual checkup"
  }'
```

### 3. Test Policy Generation

```bash
# Generate policies from intent
curl -X POST http://localhost:8000/api/v1/policies/generate \
  -H "Content-Type: application/json" \
  -d @k8s/example-intent.json

# List generated policies
curl http://localhost:8000/api/v1/policies
```

### 4. Test AI Engine

```bash
# Generate NetworkPolicy
curl -X POST http://localhost:8001/api/v1/generate-policy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-intent",
    "namespace": "healthcare",
    "rules": [{"from": "web", "to": "api", "ports": [8080]}]
  }'

# Generate RBAC
curl -X POST http://localhost:8001/api/v1/generate-rbac \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "backend",
    "namespace": "healthcare",
    "permissions": ["get", "list", "watch"]
  }'
```

### 5. Test NetworkPolicy Enforcement

```bash
# Verify network policies
kubectl get networkpolicies -n healthcare

# Test allowed: frontend -> backend (should succeed)
kubectl exec -n healthcare deploy/frontend -- wget -qO- http://backend:8000/health

# Test blocked: frontend -> postgres (should timeout/fail)
kubectl exec -n healthcare deploy/frontend -- wget -qO- --timeout=3 http://postgres:5432 || echo "BLOCKED as expected"
```

### 6. Test OPA Gatekeeper Rejection

```bash
# Apply the insecure policy (should be rejected)
kubectl apply -f opa/rejected-policy-example.yaml
# Expected: Error from server (Forbidden)

# Verify constraint is active
kubectl get constraints
```

### 7. Test Drift Detection

```bash
# Simulate drift events
curl -X POST http://localhost:8000/api/v1/drift/simulate?count=5

# Check drift events
curl http://localhost:8000/api/v1/drift/events

# Trigger analysis
curl -X POST http://localhost:8000/api/v1/drift/analyze
```

### 8. Test Risk Scoring

```bash
# Get overall risk score
curl http://localhost:8000/api/v1/risk/score

# Get per-service breakdown
curl http://localhost:8000/api/v1/risk/breakdown
```

### 9. Verify Monitoring

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana is accessible
curl http://localhost:3001/api/health

# Check metrics endpoint
curl http://localhost:8000/api/v1/metrics
```

---

## Demo Instructions

### Quick Demo Flow (5 minutes)

1. **Open Dashboard** at `http://localhost:3000`
   - Show the overview with risk scores and metrics

2. **Patient Management**
   - Navigate to Patients page
   - Create a new patient
   - Show validation (try invalid email, future DOB)

3. **Appointment Scheduling**
   - Navigate to Appointments
   - Schedule an appointment for the patient
   - Show status filtering

4. **Security Dashboard**
   - Navigate to Security page
   - Show the risk score gauge (per-service breakdown)
   - Show the pod communication map (allowed vs blocked)
   - Show drift events table

5. **Policy Generation**
   - Navigate to Policy Generator
   - Define an intent: frontend -> backend -> database
   - Generate policies
   - Show the YAML output

6. **OPA Gatekeeper Demo**
   - Try applying `opa/rejected-policy-example.yaml`
   - Show it gets rejected with a descriptive error

7. **Network Policy Verification**
   - Show `kubectl get networkpolicies -n healthcare`
   - Demonstrate blocked traffic (frontend cannot reach postgres)

8. **Monitoring**
   - Open Grafana at `http://localhost:3001`
   - Show the Security Dashboard
   - Point out risk scores, drift events, API latency

---

## Viva Explanation Summary

### Q: What is the purpose of this project?

This project demonstrates a production-grade DevSecOps platform that combines healthcare application management with AI-driven Kubernetes security. It automatically generates, validates, and enforces network security policies while continuously monitoring for policy drift and runtime threats.

### Q: How does the AI Policy Engine work?

The AI Engine accepts a JSON intent describing which services should communicate (e.g., "frontend can reach backend on port 8000"). It then automatically generates Kubernetes NetworkPolicies and RBAC rules following zero-trust principles. It creates default-deny policies as a baseline and adds explicit allow rules only for the specified communication paths.

### Q: Explain the zero-trust networking model.

Zero-trust means "deny everything by default, allow only what is explicitly needed." We implement this using:
1. A `default-deny-all` NetworkPolicy that blocks all ingress and egress
2. Specific allow policies for each required communication path
3. Each allow policy includes both egress (from sender) and ingress (to receiver)
4. DNS is allowed to all pods since service discovery is mandatory

### Q: How does OPA Gatekeeper prevent insecure policies?

OPA Gatekeeper is a Kubernetes admission webhook. When a user tries to create a NetworkPolicy, Gatekeeper intercepts the request and evaluates it against our Rego-based ConstraintTemplate. If the policy contains empty ingress rules (which would allow all traffic), Gatekeeper rejects the admission request before the policy is created. This prevents accidental or malicious security policy weakening.

### Q: How does drift detection work?

Drift detection compares the intended policy state (from the original JSON intent) with the actual policies running in the cluster (queried from the Kubernetes API). If policies are modified outside the intended state -- for example, someone manually edits a NetworkPolicy or a new unauthorized pod starts communicating -- the system detects this as "drift" and generates alerts with severity levels.

### Q: How is the risk score calculated?

Each service gets a risk score from 0-100 based on five weighted factors:
- Drift events (30%): More drift = higher risk
- Policy coverage (25%): Uncovered ports/protocols increase risk
- Configuration (20%): Privileged containers, root access increase risk
- Compliance (15%): HIPAA requirement adherence
- Runtime behavior (10%): Falco alerts increase risk
The scores are exposed as Prometheus metrics and visualized in Grafana.

### Q: What does Falco monitor?

Falco is deployed as a DaemonSet that monitors system calls on every node. Our custom rules detect shell execution in containers, unauthorized processes in the database container, access to sensitive files, network scanning tools, privilege escalation attempts, writes to system directories, outbound connections to unusual ports, and environment variable credential access.

### Q: Why use namespace separation?

We use three namespaces to enforce separation of concerns and limit blast radius:
- `healthcare`: Application workloads (isolated by network policies)
- `monitoring`: Prometheus and Grafana (can scrape but not modify app data)
- `security`: Falco and OPA (security tools with cluster-wide read access)

### Q: How would this scale for production?

For production: replace hostPath PVs with CSI-backed storage (AWS EBS, GCE PD), use a secrets manager (Vault, AWS Secrets Manager) instead of K8s Secrets, add HPA for auto-scaling, use Ingress with TLS termination, deploy across multiple availability zones, use StatefulSet or an operator (CloudNativePG) for PostgreSQL HA, and implement proper CI/CD pipelines with policy-as-code validation in the pipeline.

### Q: What makes this different from a basic CRUD app?

This project integrates security at every layer:
- **Network layer**: Zero-trust NetworkPolicies
- **Admission layer**: OPA Gatekeeper prevents insecure deployments
- **Runtime layer**: Falco detects container-level threats
- **Application layer**: Input validation, parameterized queries, HIPAA audit logs
- **AI layer**: Automated policy generation eliminates human error
- **Observability layer**: Prometheus/Grafana provide security visibility
- **Compliance layer**: Risk scoring quantifies security posture

---

## License

MIT License
"# finalsem_kubernetes" 
