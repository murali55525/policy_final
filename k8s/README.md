# Kubernetes Manifests

This directory contains all Kubernetes manifests for deploying the security policy generator stack.

## Files

| File                      | Description                         |
| ------------------------- | ----------------------------------- |
| `example-intent.json`     | Sample service communication intent |
| `demo-services.yaml`      | Demo microservices for testing      |
| `backend-deployment.yaml` | Policy Generator API deployment     |
| `monitoring-stack.yaml`   | Prometheus + Grafana                |
| `grafana-dashboard.yaml`  | Security dashboard ConfigMap        |
| `falco-deployment.yaml`   | Falco runtime security              |
| `cilium-hubble.yaml`      | Cilium Hubble network observability |

## Deployment Order

```bash
# 1. Deploy monitoring stack
kubectl apply -f monitoring-stack.yaml
kubectl apply -f grafana-dashboard.yaml

# 2. Deploy Falco (runtime security)
kubectl apply -f falco-deployment.yaml

# 3. Deploy Cilium Hubble (if using Cilium CNI)
kubectl apply -f cilium-hubble.yaml

# 4. Deploy backend API
kubectl apply -f backend-deployment.yaml

# 5. Deploy demo services
kubectl apply -f demo-services.yaml
```

## Namespaces Created

- `monitoring` - Prometheus, Grafana
- `falco` - Falco DaemonSet
- `demo` - Demo microservices
