"""
Security Risk Scorer
Calculates quantitative risk scores based on:
- Policy drift events
- Cluster configuration
- Runtime behavior
- Compliance status
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict
import math


class RiskScorer:
    """
    Calculates a comprehensive security risk score (0-100)
    Lower score = Better security posture
    """
    
    def __init__(self):
        self.weights = {
            "drift_events": 0.30,
            "policy_coverage": 0.25,
            "configuration": 0.20,
            "compliance": 0.15,
            "runtime_behavior": 0.10
        }
        
        self.severity_scores = {
            "critical": 25,
            "high": 15,
            "medium": 8,
            "low": 3,
            "info": 1
        }
        
        self.last_calculation: Optional[datetime] = None
        self.cached_score: Optional[Dict[str, Any]] = None
        self.cache_duration = timedelta(minutes=5)
    
    async def calculate(self) -> Dict[str, Any]:
        """Calculate overall risk score"""
        
        # Use cached score if recent enough
        if (self.cached_score and self.last_calculation and 
            datetime.now() - self.last_calculation < self.cache_duration):
            return self.cached_score
        
        # Calculate individual component scores
        drift_score = await self._calculate_drift_score()
        policy_score = await self._calculate_policy_coverage_score()
        config_score = await self._calculate_configuration_score()
        compliance_score = await self._calculate_compliance_score()
        runtime_score = await self._calculate_runtime_score()
        
        # Calculate weighted total
        total_score = (
            drift_score * self.weights["drift_events"] +
            policy_score * self.weights["policy_coverage"] +
            config_score * self.weights["configuration"] +
            compliance_score * self.weights["compliance"] +
            runtime_score * self.weights["runtime_behavior"]
        )
        
        # Determine risk level
        risk_level = self._get_risk_level(total_score)
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "overall_score": round(total_score, 1),
            "risk_level": risk_level,
            "components": {
                "drift_events": {
                    "score": round(drift_score, 1),
                    "weight": self.weights["drift_events"],
                    "description": "Score based on policy drift events"
                },
                "policy_coverage": {
                    "score": round(policy_score, 1),
                    "weight": self.weights["policy_coverage"],
                    "description": "Percentage of services covered by NetworkPolicies"
                },
                "configuration": {
                    "score": round(config_score, 1),
                    "weight": self.weights["configuration"],
                    "description": "Cluster security configuration assessment"
                },
                "compliance": {
                    "score": round(compliance_score, 1),
                    "weight": self.weights["compliance"],
                    "description": "Compliance with security best practices"
                },
                "runtime_behavior": {
                    "score": round(runtime_score, 1),
                    "weight": self.weights["runtime_behavior"],
                    "description": "Runtime security behavior analysis"
                }
            },
            "trend": await self._calculate_trend(),
            "recommendations": self._generate_recommendations(
                drift_score, policy_score, config_score, compliance_score, runtime_score
            )
        }
        
        self.cached_score = result
        self.last_calculation = datetime.now()
        
        return result
    
    async def get_breakdown(self) -> Dict[str, Any]:
        """Get detailed risk breakdown"""
        
        score = await self.calculate()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_risk": score["overall_score"],
            "risk_level": score["risk_level"],
            "categories": {
                "network_security": {
                    "score": await self._network_security_score(),
                    "details": {
                        "network_policies_enforced": True,
                        "default_deny_enabled": True,
                        "egress_controlled": True,
                        "service_mesh_enabled": False
                    }
                },
                "workload_security": {
                    "score": await self._workload_security_score(),
                    "details": {
                        "pod_security_policies": True,
                        "privileged_containers": 0,
                        "host_network_pods": 0,
                        "readonly_root_filesystem": True
                    }
                },
                "access_control": {
                    "score": await self._access_control_score(),
                    "details": {
                        "rbac_enabled": True,
                        "service_accounts_restricted": True,
                        "secrets_encrypted": True
                    }
                },
                "observability": {
                    "score": await self._observability_score(),
                    "details": {
                        "monitoring_enabled": True,
                        "logging_centralized": True,
                        "alerting_configured": True,
                        "audit_logs_enabled": True
                    }
                }
            },
            "historical_scores": await self._get_historical_scores(),
            "peer_comparison": {
                "industry_average": 45,
                "best_in_class": 15,
                "your_percentile": 75
            }
        }
    
    async def _calculate_drift_score(self) -> float:
        """Calculate score based on drift events (0-100, lower is better)"""
        # In production, query actual drift events from DriftDetector
        # Simulate some events for demo
        event_counts = {
            "critical": 0,
            "high": 2,
            "medium": 5,
            "low": 10,
            "info": 20
        }
        
        total_impact = sum(
            count * self.severity_scores[severity]
            for severity, count in event_counts.items()
        )
        
        # Logarithmic scaling to prevent score from maxing out too quickly
        score = min(100, 10 * math.log(total_impact + 1, 2))
        
        return score
    
    async def _calculate_policy_coverage_score(self) -> float:
        """Calculate score based on policy coverage (0-100, lower is better)"""
        # In production, check actual coverage
        total_services = 10
        services_with_policies = 8
        
        coverage_percentage = (services_with_policies / total_services) * 100
        
        # Invert: higher coverage = lower risk score
        score = 100 - coverage_percentage
        
        return score
    
    async def _calculate_configuration_score(self) -> float:
        """Calculate score based on cluster configuration"""
        checks = {
            "network_policies_enabled": True,
            "pod_security_standards": True,
            "secrets_encryption": True,
            "audit_logging": True,
            "api_server_auth": True,
            "etcd_encryption": False,
            "kubelet_authn": True,
            "admission_controllers": True
        }
        
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        # Invert: more checks passed = lower risk score
        score = ((total - passed) / total) * 100
        
        return score
    
    async def _calculate_compliance_score(self) -> float:
        """Calculate compliance score"""
        compliance_checks = {
            "cis_kubernetes_benchmark": 0.85,
            "nist_800_190": 0.80,
            "soc2_controls": 0.90,
            "pci_dss": 0.75
        }
        
        avg_compliance = sum(compliance_checks.values()) / len(compliance_checks)
        
        # Invert: higher compliance = lower risk
        score = (1 - avg_compliance) * 100
        
        return score
    
    async def _calculate_runtime_score(self) -> float:
        """Calculate runtime behavior score"""
        # Metrics from Falco/runtime monitoring
        metrics = {
            "suspicious_syscalls_24h": 5,
            "privilege_escalation_attempts": 0,
            "unexpected_network_connections": 10,
            "file_integrity_violations": 2
        }
        
        # Weight each metric
        weighted_sum = (
            metrics["suspicious_syscalls_24h"] * 3 +
            metrics["privilege_escalation_attempts"] * 10 +
            metrics["unexpected_network_connections"] * 2 +
            metrics["file_integrity_violations"] * 5
        )
        
        score = min(100, weighted_sum)
        
        return score
    
    async def _network_security_score(self) -> float:
        return 25.0
    
    async def _workload_security_score(self) -> float:
        return 30.0
    
    async def _access_control_score(self) -> float:
        return 20.0
    
    async def _observability_score(self) -> float:
        return 15.0
    
    def _get_risk_level(self, score: float) -> str:
        """Convert numeric score to risk level"""
        if score < 20:
            return "low"
        elif score < 40:
            return "moderate"
        elif score < 60:
            return "elevated"
        elif score < 80:
            return "high"
        else:
            return "critical"
    
    async def _calculate_trend(self) -> Dict[str, Any]:
        """Calculate risk score trend"""
        # In production, compare with historical scores
        return {
            "direction": "improving",
            "change_24h": -2.5,
            "change_7d": -8.3,
            "change_30d": -15.2
        }
    
    def _generate_recommendations(
        self,
        drift: float,
        policy: float,
        config: float,
        compliance: float,
        runtime: float
    ) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if drift > 30:
            recommendations.append({
                "priority": "high",
                "category": "drift_events",
                "title": "Address Policy Drift Events",
                "description": "Multiple drift events detected. Review and update NetworkPolicies.",
                "action": "Run drift analysis and update policies for flagged services"
            })
        
        if policy > 20:
            recommendations.append({
                "priority": "high",
                "category": "policy_coverage",
                "title": "Improve Policy Coverage",
                "description": "Some services lack NetworkPolicy protection.",
                "action": "Generate and deploy policies for uncovered services"
            })
        
        if config > 25:
            recommendations.append({
                "priority": "medium",
                "category": "configuration",
                "title": "Strengthen Cluster Configuration",
                "description": "Some security configurations are not optimal.",
                "action": "Enable etcd encryption and review security settings"
            })
        
        if compliance > 20:
            recommendations.append({
                "priority": "medium",
                "category": "compliance",
                "title": "Improve Compliance Posture",
                "description": "Some compliance requirements are not fully met.",
                "action": "Review CIS Kubernetes Benchmark recommendations"
            })
        
        if runtime > 30:
            recommendations.append({
                "priority": "high",
                "category": "runtime_behavior",
                "title": "Investigate Runtime Anomalies",
                "description": "Suspicious runtime behavior detected.",
                "action": "Review Falco alerts and investigate flagged pods"
            })
        
        return recommendations
    
    async def _get_historical_scores(self) -> List[Dict[str, Any]]:
        """Get historical risk scores"""
        # In production, query from time-series database
        now = datetime.now()
        return [
            {"timestamp": (now - timedelta(days=i)).isoformat(), "score": 35 + i * 2}
            for i in range(7, 0, -1)
        ]
