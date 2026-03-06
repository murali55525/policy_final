"""
Policy Drift Detector
Monitors runtime behavior and detects deviations from defined policies
Integrates with Falco, Cilium Hubble, and Kubernetes audit logs
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
import random  # For simulation - replace with real monitoring in production


class DriftEvent:
    """Represents a policy drift event"""
    
    def __init__(
        self,
        event_type: str,
        source_pod: str,
        destination_pod: str,
        action: str,
        severity: str,
        details: str,
        namespace: str = "default",
        timestamp: Optional[datetime] = None
    ):
        self.id = f"drift-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        self.event_type = event_type
        self.source_pod = source_pod
        self.destination_pod = destination_pod
        self.action = action
        self.severity = severity
        self.details = details
        self.namespace = namespace
        self.timestamp = timestamp or datetime.now()
        self.acknowledged = False
        self.resolved = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "event_type": self.event_type,
            "source_pod": self.source_pod,
            "destination_pod": self.destination_pod,
            "action": self.action,
            "severity": self.severity,
            "details": self.details,
            "namespace": self.namespace,
            "timestamp": self.timestamp.isoformat(),
            "acknowledged": self.acknowledged,
            "resolved": self.resolved
        }


class DriftDetector:
    """
    Detects policy drift by monitoring:
    1. Network connections that violate NetworkPolicies
    2. Unexpected service communications
    3. Suspicious system calls (via Falco)
    4. Configuration changes
    """
    
    def __init__(self):
        self.events: List[DriftEvent] = []
        self.allowed_connections: Dict[str, List[str]] = {}
        self.monitoring_enabled = True
        self._falco_connected = False
        self._hubble_connected = False
        
        # Severity thresholds
        self.severity_levels = {
            "critical": 5,
            "high": 4,
            "medium": 3,
            "low": 2,
            "info": 1
        }
    
    def status(self) -> str:
        """Return detector status"""
        if self.monitoring_enabled:
            return "monitoring"
        return "disabled"
    
    def register_allowed_connections(self, policies: List[Dict[str, Any]]):
        """Register allowed connections from deployed policies"""
        self.allowed_connections.clear()
        
        for policy in policies:
            if policy.get("kind") != "NetworkPolicy":
                continue
            
            spec = policy.get("spec", {})
            target_selector = spec.get("podSelector", {}).get("matchLabels", {})
            target_app = target_selector.get("app", "unknown")
            
            # Extract allowed sources from ingress rules
            for ingress in spec.get("ingress", []):
                for from_rule in ingress.get("from", []):
                    source_selector = from_rule.get("podSelector", {}).get("matchLabels", {})
                    source_app = source_selector.get("app", "unknown")
                    
                    if target_app not in self.allowed_connections:
                        self.allowed_connections[target_app] = []
                    self.allowed_connections[target_app].append(source_app)
    
    def check_connection(
        self,
        source: str,
        destination: str,
        port: int,
        protocol: str = "TCP"
    ) -> Dict[str, Any]:
        """Check if a connection is allowed by policies"""
        
        allowed_sources = self.allowed_connections.get(destination, [])
        
        if source in allowed_sources:
            return {
                "allowed": True,
                "reason": f"Connection from {source} to {destination} is explicitly allowed"
            }
        
        # Connection not allowed - create drift event
        event = DriftEvent(
            event_type="unauthorized_connection",
            source_pod=source,
            destination_pod=destination,
            action="blocked",
            severity="high",
            details=f"Attempted connection from {source} to {destination}:{port}/{protocol} not allowed by policy",
        )
        self.events.append(event)
        
        return {
            "allowed": False,
            "reason": f"Connection from {source} to {destination} not in allowed list",
            "drift_event_id": event.id
        }
    
    async def analyze(self) -> Dict[str, Any]:
        """
        Perform comprehensive drift analysis
        Returns analysis results with recommendations
        """
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "total_events": len(self.events),
            "events_by_severity": defaultdict(int),
            "events_by_type": defaultdict(int),
            "top_sources": defaultdict(int),
            "top_destinations": defaultdict(int),
            "recommendations": [],
            "risk_indicators": []
        }
        
        # Analyze recent events (last 24 hours)
        cutoff = datetime.now() - timedelta(hours=24)
        recent_events = [e for e in self.events if e.timestamp > cutoff]
        
        for event in recent_events:
            analysis["events_by_severity"][event.severity] += 1
            analysis["events_by_type"][event.event_type] += 1
            analysis["top_sources"][event.source_pod] += 1
            analysis["top_destinations"][event.destination_pod] += 1
        
        # Convert defaultdicts to regular dicts
        analysis["events_by_severity"] = dict(analysis["events_by_severity"])
        analysis["events_by_type"] = dict(analysis["events_by_type"])
        analysis["top_sources"] = dict(sorted(
            analysis["top_sources"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10])
        analysis["top_destinations"] = dict(sorted(
            analysis["top_destinations"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10])
        
        # Generate recommendations
        if analysis["events_by_severity"].get("critical", 0) > 0:
            analysis["recommendations"].append({
                "priority": "high",
                "action": "Investigate critical drift events immediately",
                "details": f"{analysis['events_by_severity']['critical']} critical events detected"
            })
        
        if analysis["events_by_type"].get("unauthorized_connection", 0) > 10:
            analysis["recommendations"].append({
                "priority": "medium",
                "action": "Review and update NetworkPolicies",
                "details": "High volume of unauthorized connection attempts detected"
            })
        
        # Add risk indicators
        if len(recent_events) > 100:
            analysis["risk_indicators"].append({
                "indicator": "high_event_volume",
                "severity": "medium",
                "description": "Unusually high number of drift events"
            })
        
        return analysis
    
    def get_events(
        self,
        limit: int = 100,
        severity: Optional[str] = None,
        timeframe: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get drift events with optional filtering"""
        
        filtered_events = self.events.copy()
        
        # Filter by timeframe
        if timeframe:
            hours = int(timeframe.replace("h", ""))
            cutoff = datetime.now() - timedelta(hours=hours)
            filtered_events = [e for e in filtered_events if e.timestamp > cutoff]
        
        # Filter by severity
        if severity:
            filtered_events = [e for e in filtered_events if e.severity == severity]
        
        # Filter by event type
        if event_type:
            filtered_events = [e for e in filtered_events if e.event_type == event_type]
        
        # Sort by timestamp (newest first)
        filtered_events.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply limit
        filtered_events = filtered_events[:limit]
        
        return [e.to_dict() for e in filtered_events]
    
    def acknowledge_event(self, event_id: str) -> bool:
        """Acknowledge a drift event"""
        for event in self.events:
            if event.id == event_id:
                event.acknowledged = True
                return True
        return False
    
    def resolve_event(self, event_id: str, resolution: str = "") -> bool:
        """Mark a drift event as resolved"""
        for event in self.events:
            if event.id == event_id:
                event.resolved = True
                return True
        return False
    
    async def start_monitoring(self):
        """Start real-time monitoring (connects to Falco/Hubble)"""
        self.monitoring_enabled = True
        # In production, this would connect to:
        # - Falco gRPC API
        # - Cilium Hubble
        # - Kubernetes audit log stream
        
    async def stop_monitoring(self):
        """Stop real-time monitoring"""
        self.monitoring_enabled = False
    
    def simulate_events(self, count: int = 10):
        """Generate simulated drift events for testing"""
        services = ["frontend", "backend", "database", "cache", "auth", "api-gateway"]
        severities = ["critical", "high", "medium", "low", "info"]
        event_types = [
            "unauthorized_connection",
            "suspicious_syscall",
            "config_change",
            "privilege_escalation",
            "file_access"
        ]
        
        for i in range(count):
            source = random.choice(services)
            dest = random.choice([s for s in services if s != source])
            
            event = DriftEvent(
                event_type=random.choice(event_types),
                source_pod=f"{source}-{random.randint(1, 5)}",
                destination_pod=f"{dest}-{random.randint(1, 5)}",
                action=random.choice(["blocked", "logged", "alerted"]),
                severity=random.choice(severities),
                details=f"Simulated drift event {i+1}",
                timestamp=datetime.now() - timedelta(
                    hours=random.randint(0, 48),
                    minutes=random.randint(0, 59)
                )
            )
            self.events.append(event)


class FalcoIntegration:
    """Integration with Falco for runtime security monitoring"""
    
    def __init__(self, falco_url: str = "localhost:5060"):
        self.falco_url = falco_url
        self.connected = False
    
    async def connect(self):
        """Connect to Falco gRPC endpoint"""
        # In production, implement actual gRPC connection
        self.connected = True
    
    async def get_alerts(self, since: datetime = None) -> List[Dict]:
        """Get Falco alerts"""
        # In production, query Falco for alerts
        return []
    
    def parse_alert(self, alert: Dict) -> DriftEvent:
        """Convert Falco alert to DriftEvent"""
        return DriftEvent(
            event_type="suspicious_syscall",
            source_pod=alert.get("fields", {}).get("k8s.pod.name", "unknown"),
            destination_pod="system",
            action="alerted",
            severity=self._map_falco_priority(alert.get("priority", "WARNING")),
            details=alert.get("output", ""),
            namespace=alert.get("fields", {}).get("k8s.ns.name", "default")
        )
    
    def _map_falco_priority(self, priority: str) -> str:
        """Map Falco priority to our severity levels"""
        mapping = {
            "EMERGENCY": "critical",
            "ALERT": "critical",
            "CRITICAL": "critical",
            "ERROR": "high",
            "WARNING": "medium",
            "NOTICE": "low",
            "INFORMATIONAL": "info",
            "DEBUG": "info"
        }
        return mapping.get(priority, "medium")


class HubbleIntegration:
    """Integration with Cilium Hubble for network flow monitoring"""
    
    def __init__(self, hubble_url: str = "localhost:4245"):
        self.hubble_url = hubble_url
        self.connected = False
    
    async def connect(self):
        """Connect to Hubble Relay"""
        # In production, implement actual gRPC connection
        self.connected = True
    
    async def get_flows(
        self,
        since: datetime = None,
        verdict: str = None  # FORWARDED, DROPPED, ERROR
    ) -> List[Dict]:
        """Get network flows from Hubble"""
        # In production, query Hubble for flows
        return []
    
    def flow_to_drift_event(self, flow: Dict) -> Optional[DriftEvent]:
        """Convert dropped flow to drift event"""
        if flow.get("verdict") != "DROPPED":
            return None
        
        return DriftEvent(
            event_type="unauthorized_connection",
            source_pod=flow.get("source", {}).get("pod_name", "unknown"),
            destination_pod=flow.get("destination", {}).get("pod_name", "unknown"),
            action="blocked",
            severity="high",
            details=f"Connection blocked by NetworkPolicy: {flow.get('drop_reason', 'unknown')}",
            namespace=flow.get("source", {}).get("namespace", "default")
        )
