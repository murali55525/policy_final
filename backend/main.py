"""
Kubernetes Security Policy Generator API
Generates NetworkPolicies from service communication intent
with real-time monitoring, drift detection, and risk scoring
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import json
import yaml
import uuid
from datetime import datetime
from policy_generator import PolicyGenerator
from drift_detector import DriftDetector
from risk_scorer import RiskScorer
from kubernetes_client import KubernetesClient
import healthcare

app = FastAPI(
    title="K8s Security Policy Generator",
    description="Generate and enforce Kubernetes security policies from intent",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
policy_generator = PolicyGenerator()
drift_detector = DriftDetector()
risk_scorer = RiskScorer()
k8s_client = KubernetesClient()

# In-memory storage (use Redis/DB in production)
policies_store: Dict[str, Any] = {}
connected_websockets: List[WebSocket] = []

# Seed drift detector with initial simulated events so the UI has data
drift_detector.simulate_events(15)


# Pydantic Models
class ServiceRule(BaseModel):
    from_service: str
    to_service: str
    ports: Optional[List[int]] = None
    protocols: Optional[List[str]] = ["TCP"]
    namespace: Optional[str] = "default"


class Intent(BaseModel):
    name: str
    namespace: Optional[str] = "default"
    rules: List[ServiceRule]
    description: Optional[str] = ""


class PolicyDeployRequest(BaseModel):
    policy_id: str
    namespace: Optional[str] = "default"


class DriftEvent(BaseModel):
    timestamp: str
    source_pod: str
    destination_pod: str
    action: str
    severity: str
    details: str


# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "K8s Security Policy Generator API",
        "version": "1.0.0",
        "endpoints": {
            "generate": "POST /api/v1/policies/generate",
            "deploy": "POST /api/v1/policies/deploy",
            "list": "GET /api/v1/policies",
            "drift": "GET /api/v1/drift/events",
            "risk": "GET /api/v1/risk/score",
            "metrics": "GET /api/v1/metrics"
        }
    }


@app.post("/api/v1/policies/generate")
async def generate_policies(intent: Intent):
    """Generate Kubernetes NetworkPolicies from service intent"""
    try:
        # Convert intent to dict format for generator
        intent_dict = {
            "name": intent.name,
            "namespace": intent.namespace,
            "rules": [
                {
                    "from": rule.from_service,
                    "to": rule.to_service,
                    "ports": rule.ports,
                    "protocols": rule.protocols,
                    "namespace": rule.namespace
                }
                for rule in intent.rules
            ]
        }
        
        # Generate policies
        policies = policy_generator.generate(intent_dict)
        
        # Store policies
        policy_id = str(uuid.uuid4())[:8]
        policies_store[policy_id] = {
            "id": policy_id,
            "name": intent.name,
            "intent": intent_dict,
            "policies": policies,
            "created_at": datetime.now().isoformat(),
            "deployed": False,
            "namespace": intent.namespace
        }
        
        return {
            "success": True,
            "policy_id": policy_id,
            "policies_count": len(policies),
            "policies": policies,
            "yaml": policy_generator.to_yaml(policies)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Legacy endpoint for backward compatibility
@app.post("/generate")
async def generate_legacy(intent: dict):
    """Legacy endpoint - use /api/v1/policies/generate instead"""
    from policy_generator import generate_policies as gen_pol
    return gen_pol(intent)


@app.post("/api/v1/policies/deploy")
async def deploy_policies(request: PolicyDeployRequest):
    """Deploy generated policies to Kubernetes cluster"""
    try:
        if request.policy_id not in policies_store:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        policy_data = policies_store[request.policy_id]
        
        # Deploy to Kubernetes
        results = await k8s_client.apply_policies(
            policy_data["policies"],
            request.namespace
        )
        
        # Update store
        policies_store[request.policy_id]["deployed"] = True
        policies_store[request.policy_id]["deployed_at"] = datetime.now().isoformat()
        
        # Notify connected clients
        await broadcast_event({
            "type": "policy_deployed",
            "policy_id": request.policy_id,
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "policy_id": request.policy_id,
            "deployment_results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/policies")
async def list_policies():
    """List all generated policies"""
    return {
        "policies": list(policies_store.values()),
        "total": len(policies_store)
    }


@app.get("/api/v1/policies/{policy_id}")
async def get_policy(policy_id: str):
    """Get specific policy by ID"""
    if policy_id not in policies_store:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policies_store[policy_id]


@app.delete("/api/v1/policies/{policy_id}")
async def delete_policy(policy_id: str):
    """Delete a policy"""
    if policy_id not in policies_store:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    policy_data = policies_store[policy_id]
    
    # Remove from Kubernetes if deployed
    if policy_data.get("deployed"):
        await k8s_client.delete_policies(
            policy_data["policies"],
            policy_data["namespace"]
        )
    
    del policies_store[policy_id]
    return {"success": True, "message": "Policy deleted"}


@app.get("/api/v1/drift/events")
async def get_drift_events(limit: int = 100):
    """Get policy drift events detected by monitoring"""
    events = drift_detector.get_events(limit)
    return {
        "events": events,
        "total": len(events)
    }


@app.post("/api/v1/drift/analyze")
async def analyze_drift():
    """Trigger drift analysis"""
    try:
        analysis = await drift_detector.analyze()
        
        # Notify connected clients
        await broadcast_event({
            "type": "drift_analysis",
            "result": analysis,
            "timestamp": datetime.now().isoformat()
        })
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/drift/simulate")
async def simulate_drift_events(count: int = 10):
    """Simulate drift events for testing"""
    drift_detector.simulate_events(count)
    return {"success": True, "message": f"Simulated {count} drift events"}


@app.get("/api/v1/risk/score")
async def get_risk_score():
    """Get current security risk score"""
    try:
        score = await risk_scorer.calculate()
        return score
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/risk/breakdown")
async def get_risk_breakdown():
    """Get detailed risk breakdown by category"""
    try:
        breakdown = await risk_scorer.get_breakdown()
        return breakdown
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/metrics")
async def get_metrics():
    """Get system metrics for monitoring"""
    try:
        metrics = await k8s_client.get_metrics()
        return {
            "cluster_metrics": metrics,
            "policies_total": len(policies_store),
            "policies_deployed": sum(1 for p in policies_store.values() if p.get("deployed")),
            "drift_events_24h": len(drift_detector.get_events(timeframe="24h")),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/services")
async def get_services():
    """Get list of services in the cluster"""
    try:
        services = await k8s_client.get_services()
        return {"services": services}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/namespaces")
async def get_namespaces():
    """Get list of namespaces"""
    try:
        namespaces = await k8s_client.get_namespaces()
        return {"namespaces": namespaces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_text()
            # Process client messages if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)


async def broadcast_event(event: dict):
    """Broadcast event to all connected WebSocket clients"""
    for websocket in connected_websockets:
        try:
            await websocket.send_json(event)
        except:
            pass


# ─── Healthcare Endpoints ───

@app.get("/api/v1/healthcare/stats")
async def healthcare_stats():
    return healthcare.get_healthcare_stats()


@app.get("/api/v1/healthcare/patients")
async def list_patients():
    return {"patients": healthcare.list_patients(), "total": len(healthcare.patients_store)}


@app.get("/api/v1/healthcare/patients/{patient_id}")
async def get_patient(patient_id: str):
    p = healthcare.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@app.post("/api/v1/healthcare/patients")
async def create_patient(data: dict):
    if not data.get("name"):
        raise HTTPException(status_code=400, detail="Patient name is required")
    return healthcare.create_patient(data)


@app.put("/api/v1/healthcare/patients/{patient_id}")
async def update_patient(patient_id: str, data: dict):
    p = healthcare.update_patient(patient_id, data)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@app.delete("/api/v1/healthcare/patients/{patient_id}")
async def delete_patient(patient_id: str):
    if not healthcare.delete_patient(patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True}


@app.get("/api/v1/healthcare/appointments")
async def list_appointments(patient_id: str = None):
    appts = healthcare.list_appointments(patient_id)
    return {"appointments": appts, "total": len(appts)}


@app.get("/api/v1/healthcare/appointments/{appt_id}")
async def get_appointment(appt_id: str):
    a = healthcare.get_appointment(appt_id)
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return a


@app.post("/api/v1/healthcare/appointments")
async def create_appointment(data: dict):
    if not data.get("patient_id"):
        raise HTTPException(status_code=400, detail="patient_id is required")
    return healthcare.create_appointment(data)


@app.put("/api/v1/healthcare/appointments/{appt_id}")
async def update_appointment(appt_id: str, data: dict):
    a = healthcare.update_appointment(appt_id, data)
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return a


@app.delete("/api/v1/healthcare/appointments/{appt_id}")
async def delete_appointment(appt_id: str):
    if not healthcare.delete_appointment(appt_id):
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True}


# ─── Drift event management ───

@app.post("/api/v1/drift/events/{event_id}/acknowledge")
async def acknowledge_drift_event(event_id: str):
    if not drift_detector.acknowledge_event(event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return {"success": True}


@app.post("/api/v1/drift/events/{event_id}/resolve")
async def resolve_drift_event(event_id: str):
    if not drift_detector.resolve_event(event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    return {"success": True}


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "api": "up",
            "policy_generator": "up",
            "drift_detector": drift_detector.status(),
            "risk_scorer": "up"
        }
    }


@app.get("/api/v1/system/health")
async def system_health():
    """Full system health status for the dashboard"""
    drift_events = drift_detector.get_events(100)
    critical_count = sum(1 for e in drift_events if e.get("severity") == "critical")
    high_count = sum(1 for e in drift_events if e.get("severity") == "high")

    try:
        risk_data = await risk_scorer.calculate()
        risk_score = risk_data.get("overall_score", 0)
        risk_level = risk_data.get("risk_level", "unknown")
    except Exception:
        risk_score = 0
        risk_level = "unknown"

    services = [
        {
            "name": "Backend API",
            "status": "healthy",
            "uptime": "running",
            "port": 8000,
            "url": "/api/v1",
        },
        {
            "name": "Prometheus",
            "status": "healthy",
            "uptime": "running",
            "port": 9090,
            "url": "http://localhost:9090",
        },
        {
            "name": "Grafana",
            "status": "healthy",
            "uptime": "running",
            "port": 3001,
            "url": "http://localhost:3001",
        },
        {
            "name": "Policy Generator",
            "status": "healthy",
            "uptime": "running",
            "port": 8000,
            "url": "/api/v1/policies",
        },
        {
            "name": "Drift Detector",
            "status": drift_detector.status(),
            "uptime": "running",
            "port": 8000,
            "url": "/api/v1/drift/events",
        },
    ]

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": services,
        "summary": {
            "total_services": len(services),
            "healthy": sum(1 for s in services if s["status"] in ("healthy", "monitoring")),
            "degraded": 0,
            "down": 0,
        },
        "security": {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "critical_alerts": critical_count,
            "high_alerts": high_count,
            "total_drift_events": len(drift_events),
            "policies_total": len(policies_store),
            "policies_deployed": sum(1 for p in policies_store.values() if p.get("deployed")),
        },
        "patients": {
            "total": len(healthcare.patients_store),
            "admitted": sum(1 for p in healthcare.patients_store.values() if p["status"] == "admitted"),
            "critical": sum(1 for p in healthcare.patients_store.values() if p["status"] == "critical"),
        },
    }


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint"""
    from fastapi.responses import PlainTextResponse
    
    # Get current stats
    policies_total = len(policies_store)
    policies_deployed = sum(1 for p in policies_store.values() if p.get("deployed", False))
    drift_events_count = len(drift_detector.events)
    
    # Get risk score (async method)
    try:
        risk_data = await risk_scorer.calculate()
        overall_score = risk_data.get('overall_score', 50)
    except Exception:
        overall_score = 50
    
    # Format as Prometheus metrics
    metrics = f"""# HELP policies_total Total number of generated policies
# TYPE policies_total gauge
policies_total {policies_total}

# HELP policies_deployed Number of deployed policies
# TYPE policies_deployed gauge
policies_deployed {policies_deployed}

# HELP drift_events_total Total number of drift events detected
# TYPE drift_events_total counter
drift_events_total {drift_events_count}

# HELP security_risk_score Current security risk score (0-100, lower is better)
# TYPE security_risk_score gauge
security_risk_score {overall_score}

# HELP policy_generator_up Policy generator API status
# TYPE policy_generator_up gauge
policy_generator_up 1

# HELP drift_detector_up Drift detector status
# TYPE drift_detector_up gauge
drift_detector_up 1
"""
    return PlainTextResponse(content=metrics, media_type="text/plain")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
