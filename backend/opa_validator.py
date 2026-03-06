"""
OPA (Open Policy Agent) Policy Validator
Validates generated Kubernetes NetworkPolicies against OPA/Rego security rules.
Mirrors the rules from opa/validate-policy.rego for in-process validation.
Supports both local validation and optional OPA server integration.
"""

import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class OPAViolation:
    """Represents a single OPA policy violation"""

    def __init__(self, rule: str, message: str, severity: str,
                 policy_name: str, namespace: str, remediation: str = "",
                 compliance: Optional[List[str]] = None):
        self.rule = rule
        self.message = message
        self.severity = severity
        self.policy_name = policy_name
        self.namespace = namespace
        self.remediation = remediation
        self.compliance = compliance or []
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule": self.rule,
            "message": self.message,
            "severity": self.severity,
            "policy_name": self.policy_name,
            "namespace": self.namespace,
            "remediation": self.remediation,
            "compliance": self.compliance,
            "timestamp": self.timestamp,
        }


class OPAValidator:
    """
    Validates Kubernetes NetworkPolicies against OPA/Rego security rules.
    Implements the same checks as opa/validate-policy.rego plus additional
    advanced security checks for healthcare environments.
    """

    COMPLIANCE_FRAMEWORKS = {
        "HIPAA": "Health Insurance Portability and Accountability Act",
        "NIST-800-53": "NIST Special Publication 800-53",
        "CIS-K8S": "CIS Kubernetes Benchmark",
        "SOC2": "Service Organization Control 2",
        "PCI-DSS": "Payment Card Industry Data Security Standard",
    }

    def __init__(self):
        self.validation_history: List[Dict[str, Any]] = []

    def validate_policies(self, policies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate a list of NetworkPolicy manifests against all OPA rules.

        Returns a comprehensive validation report with violations,
        compliance status, and security score.
        """
        all_violations = []
        policy_results = []

        for policy in policies:
            violations = self._validate_single_policy(policy)
            policy_name = policy.get("metadata", {}).get("name", "unknown")
            policy_results.append({
                "policy_name": policy_name,
                "namespace": policy.get("metadata", {}).get("namespace", ""),
                "violations": [v.to_dict() for v in violations],
                "violation_count": len(violations),
                "passed": len(violations) == 0,
                "severity_counts": self._count_severities(violations),
            })
            all_violations.extend(violations)

        # Calculate overall security score
        security_score = self._calculate_security_score(all_violations, len(policies))
        compliance_status = self._check_compliance(all_violations)

        report = {
            "validated_at": datetime.now().isoformat(),
            "total_policies": len(policies),
            "total_violations": len(all_violations),
            "policies_passed": sum(1 for r in policy_results if r["passed"]),
            "policies_failed": sum(1 for r in policy_results if not r["passed"]),
            "security_score": security_score,
            "overall_passed": len(all_violations) == 0,
            "severity_summary": self._count_severities(all_violations),
            "compliance": compliance_status,
            "policy_results": policy_results,
            "violations": [v.to_dict() for v in all_violations],
            "recommendations": self._generate_recommendations(all_violations),
        }

        # Store in history
        self.validation_history.append({
            "timestamp": report["validated_at"],
            "total_policies": report["total_policies"],
            "total_violations": report["total_violations"],
            "security_score": report["security_score"],
            "passed": report["overall_passed"],
        })

        return report

    def _validate_single_policy(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        """Run all validation rules against a single NetworkPolicy"""
        violations = []

        # Only validate NetworkPolicy resources
        if policy.get("kind") != "NetworkPolicy":
            return violations

        # Run each OPA rule
        violations.extend(self._rule_deny_allow_all(policy))
        violations.extend(self._rule_deny_missing_pod_selector(policy))
        violations.extend(self._rule_deny_no_policy_types(policy))
        violations.extend(self._rule_require_namespace(policy))
        violations.extend(self._rule_deny_allow_all_egress(policy))
        violations.extend(self._rule_deny_missing_ports(policy))
        violations.extend(self._rule_deny_wildcard_cidr(policy))
        violations.extend(self._rule_require_labels(policy))
        violations.extend(self._rule_deny_privileged_ports(policy))

        return violations

    # ========================================================================
    # RULE 1: deny_allow_all — Blocks allow-all ingress patterns
    # ========================================================================
    def _rule_deny_allow_all(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})
        ingress = spec.get("ingress")

        if ingress is None:
            return violations

        # Check for empty ingress list
        if isinstance(ingress, list) and len(ingress) == 0:
            violations.append(OPAViolation(
                rule="deny_allow_all",
                message=f"NetworkPolicy '{name}' in namespace '{namespace}' has an empty ingress list (ingress: []). This is ambiguous.",
                severity=Severity.HIGH,
                policy_name=name,
                namespace=namespace,
                remediation="Remove the 'ingress' field entirely and set policyTypes: [\"Ingress\"] for deny-all, or add explicit ingress rules.",
                compliance=["HIPAA", "CIS-K8S", "NIST-800-53"],
            ))

        for i, ingress_rule in enumerate(ingress if isinstance(ingress, list) else []):
            # Detect empty ingress rule: {}
            if isinstance(ingress_rule, dict) and len(ingress_rule) == 0:
                violations.append(OPAViolation(
                    rule="deny_allow_all",
                    message=f"NetworkPolicy '{name}' in namespace '{namespace}' contains an empty ingress rule '{{}}' at index {i}. This allows ALL inbound traffic.",
                    severity=Severity.CRITICAL,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Specify explicit 'from' sources and 'ports' in every ingress rule.",
                    compliance=["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
                ))

            # Detect ingress rule without 'from' field
            if isinstance(ingress_rule, dict) and len(ingress_rule) > 0 and "from" not in ingress_rule:
                violations.append(OPAViolation(
                    rule="deny_allow_all",
                    message=f"NetworkPolicy '{name}' in namespace '{namespace}', ingress rule #{i+1} has no 'from' field. Traffic is accepted from any source.",
                    severity=Severity.HIGH,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Add a 'from' section with podSelector, namespaceSelector, or ipBlock to restrict traffic sources.",
                    compliance=["HIPAA", "CIS-K8S"],
                ))

        return violations

    # ========================================================================
    # RULE 2: deny_missing_pod_selector — Blocks empty podSelector
    # ========================================================================
    def _rule_deny_missing_pod_selector(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})
        pod_selector = spec.get("podSelector", {})

        # Check if podSelector is empty (targets all pods)
        if isinstance(pod_selector, dict) and len(pod_selector) == 0:
            # Skip for default-deny policies (which intentionally use empty podSelector)
            policy_type = metadata.get("labels", {}).get("policy-type", "")
            if policy_type == "default-deny":
                return violations

            violations.append(OPAViolation(
                rule="deny_missing_pod_selector",
                message=f"NetworkPolicy '{name}' in namespace '{namespace}' uses an empty podSelector (podSelector: {{}}), which matches ALL pods.",
                severity=Severity.MEDIUM,
                policy_name=name,
                namespace=namespace,
                remediation="Use 'matchLabels' or 'matchExpressions' in podSelector to target specific pods.",
                compliance=["CIS-K8S", "NIST-800-53"],
            ))

        return violations

    # ========================================================================
    # RULE 3: deny_no_policy_types — Requires explicit policyTypes
    # ========================================================================
    def _rule_deny_no_policy_types(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})

        policy_types = spec.get("policyTypes")
        if policy_types is None:
            violations.append(OPAViolation(
                rule="deny_no_policy_types",
                message=f"NetworkPolicy '{name}' in namespace '{namespace}' does not specify 'policyTypes'. Kubernetes infers them implicitly.",
                severity=Severity.MEDIUM,
                policy_name=name,
                namespace=namespace,
                remediation="Always specify policyTypes explicitly: [\"Ingress\", \"Egress\"].",
                compliance=["CIS-K8S"],
            ))
        elif isinstance(policy_types, list) and len(policy_types) == 0:
            violations.append(OPAViolation(
                rule="deny_no_policy_types",
                message=f"NetworkPolicy '{name}' in namespace '{namespace}' has an empty policyTypes list.",
                severity=Severity.MEDIUM,
                policy_name=name,
                namespace=namespace,
                remediation="Specify at least one policy type: \"Ingress\", \"Egress\", or both.",
                compliance=["CIS-K8S"],
            ))

        return violations

    # ========================================================================
    # RULE 4: require_namespace — Mandates namespace in metadata
    # ========================================================================
    def _rule_require_namespace(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace")

        if namespace is None:
            violations.append(OPAViolation(
                rule="require_namespace",
                message=f"NetworkPolicy '{name}' does not specify a namespace in metadata.namespace.",
                severity=Severity.HIGH,
                policy_name=name,
                namespace="",
                remediation="Always specify the target namespace explicitly to prevent accidental misapplication.",
                compliance=["HIPAA", "CIS-K8S", "NIST-800-53"],
            ))
        elif namespace == "":
            violations.append(OPAViolation(
                rule="require_namespace",
                message=f"NetworkPolicy '{name}' has an empty namespace string.",
                severity=Severity.HIGH,
                policy_name=name,
                namespace="",
                remediation="Provide a valid namespace name.",
                compliance=["HIPAA", "CIS-K8S"],
            ))

        return violations

    # ========================================================================
    # RULE 5: deny_allow_all_egress — Blocks overly permissive egress
    # ========================================================================
    def _rule_deny_allow_all_egress(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})
        egress = spec.get("egress")

        if egress is None:
            return violations

        for i, egress_rule in enumerate(egress if isinstance(egress, list) else []):
            if isinstance(egress_rule, dict) and len(egress_rule) == 0:
                violations.append(OPAViolation(
                    rule="deny_allow_all_egress",
                    message=f"NetworkPolicy '{name}' in namespace '{namespace}' contains an empty egress rule '{{}}' at index {i}. This allows ALL outbound traffic.",
                    severity=Severity.CRITICAL,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Specify explicit 'to' targets and 'ports' in every egress rule.",
                    compliance=["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
                ))

            if isinstance(egress_rule, dict) and len(egress_rule) > 0 and "to" not in egress_rule:
                violations.append(OPAViolation(
                    rule="deny_allow_all_egress",
                    message=f"NetworkPolicy '{name}' in namespace '{namespace}', egress rule #{i+1} has no 'to' field. Traffic can go to ANY destination.",
                    severity=Severity.HIGH,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Add a 'to' section with podSelector, namespaceSelector, or ipBlock.",
                    compliance=["HIPAA", "CIS-K8S"],
                ))

        return violations

    # ========================================================================
    # RULE 6: deny_missing_ports — Warns about missing port restrictions
    # ========================================================================
    def _rule_deny_missing_ports(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})

        # Check ingress rules
        for i, rule in enumerate(spec.get("ingress") or []):
            if isinstance(rule, dict) and rule.get("from") and "ports" not in rule:
                violations.append(OPAViolation(
                    rule="deny_missing_ports",
                    message=f"NetworkPolicy '{name}', ingress rule #{i+1} allows traffic on ALL ports (no port restriction).",
                    severity=Severity.MEDIUM,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Add 'ports' to restrict which ports can receive traffic.",
                    compliance=["CIS-K8S", "PCI-DSS"],
                ))

        # Check egress rules
        for i, rule in enumerate(spec.get("egress") or []):
            if isinstance(rule, dict) and rule.get("to") and "ports" not in rule:
                violations.append(OPAViolation(
                    rule="deny_missing_ports",
                    message=f"NetworkPolicy '{name}', egress rule #{i+1} allows traffic on ALL ports (no port restriction).",
                    severity=Severity.MEDIUM,
                    policy_name=name,
                    namespace=namespace,
                    remediation="Add 'ports' to restrict which ports can send traffic.",
                    compliance=["CIS-K8S", "PCI-DSS"],
                ))

        return violations

    # ========================================================================
    # RULE 7: deny_wildcard_cidr — Blocks 0.0.0.0/0 CIDR ranges
    # ========================================================================
    def _rule_deny_wildcard_cidr(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})

        dangerous_cidrs = {"0.0.0.0/0", "::/0"}

        def check_ip_blocks(rules, direction):
            for i, rule in enumerate(rules or []):
                if not isinstance(rule, dict):
                    continue
                direction_key = "from" if direction == "ingress" else "to"
                for selector in (rule.get(direction_key) or []):
                    ip_block = selector.get("ipBlock", {})
                    cidr = ip_block.get("cidr", "")
                    if cidr in dangerous_cidrs:
                        violations.append(OPAViolation(
                            rule="deny_wildcard_cidr",
                            message=f"NetworkPolicy '{name}', {direction} rule #{i+1} uses wildcard CIDR '{cidr}'. This allows traffic from/to ANY IP address.",
                            severity=Severity.CRITICAL,
                            policy_name=name,
                            namespace=namespace,
                            remediation=f"Replace '{cidr}' with specific IP ranges for your services.",
                            compliance=["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
                        ))

        check_ip_blocks(spec.get("ingress"), "ingress")
        check_ip_blocks(spec.get("egress"), "egress")

        return violations

    # ========================================================================
    # RULE 8: require_labels — Ensures policies have management labels
    # ========================================================================
    def _rule_require_labels(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        labels = metadata.get("labels", {})

        if not labels.get("app.kubernetes.io/managed-by"):
            violations.append(OPAViolation(
                rule="require_labels",
                message=f"NetworkPolicy '{name}' is missing 'app.kubernetes.io/managed-by' label.",
                severity=Severity.LOW,
                policy_name=name,
                namespace=namespace,
                remediation="Add label 'app.kubernetes.io/managed-by' for policy lifecycle management.",
                compliance=["CIS-K8S"],
            ))

        return violations

    # ========================================================================
    # RULE 9: deny_privileged_ports — Warns about privileged port usage
    # ========================================================================
    def _rule_deny_privileged_ports(self, policy: Dict[str, Any]) -> List[OPAViolation]:
        violations = []
        metadata = policy.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = policy.get("spec", {})

        # Well-known unsafe ports
        unsafe_ports = {22, 23, 25, 135, 139, 445, 3389}

        def check_ports(rules, direction):
            for i, rule in enumerate(rules or []):
                if not isinstance(rule, dict):
                    continue
                for port_spec in (rule.get("ports") or []):
                    port = port_spec.get("port")
                    if isinstance(port, int) and port in unsafe_ports:
                        violations.append(OPAViolation(
                            rule="deny_privileged_ports",
                            message=f"NetworkPolicy '{name}', {direction} rule #{i+1} allows port {port} which is a commonly exploited port.",
                            severity=Severity.HIGH,
                            policy_name=name,
                            namespace=namespace,
                            remediation=f"Verify that port {port} is required. Consider using a more secure alternative.",
                            compliance=["CIS-K8S", "NIST-800-53"],
                        ))

        check_ports(spec.get("ingress"), "ingress")
        check_ports(spec.get("egress"), "egress")

        return violations

    # ========================================================================
    # Helper methods
    # ========================================================================

    def _count_severities(self, violations: List[OPAViolation]) -> Dict[str, int]:
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for v in violations:
            sev = v.severity if isinstance(v, OPAViolation) else v.get("severity", "info")
            if sev in counts:
                counts[sev] += 1
        return counts

    def _calculate_security_score(self, violations: List[OPAViolation], total_policies: int) -> float:
        """Calculate 0-100 security score (100 = perfect, 0 = critical issues)"""
        if total_policies == 0:
            return 100.0

        severity_penalties = {
            Severity.CRITICAL: 25,
            Severity.HIGH: 15,
            Severity.MEDIUM: 8,
            Severity.LOW: 3,
            Severity.INFO: 1,
        }

        total_penalty = sum(severity_penalties.get(v.severity, 5) for v in violations)
        score = max(0, 100 - total_penalty)
        return round(score, 1)

    def _check_compliance(self, violations: List[OPAViolation]) -> Dict[str, Any]:
        """Check compliance status against known frameworks"""
        compliance = {}
        for framework in self.COMPLIANCE_FRAMEWORKS:
            framework_violations = [
                v for v in violations if framework in v.compliance
            ]
            compliance[framework] = {
                "name": self.COMPLIANCE_FRAMEWORKS[framework],
                "passed": len(framework_violations) == 0,
                "violations": len(framework_violations),
                "status": "COMPLIANT" if len(framework_violations) == 0 else "NON-COMPLIANT",
            }
        return compliance

    def _generate_recommendations(self, violations: List[OPAViolation]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations based on violations"""
        recommendations = []
        seen_rules = set()

        for v in violations:
            if v.rule not in seen_rules:
                seen_rules.add(v.rule)
                priority = "critical" if v.severity in (Severity.CRITICAL, Severity.HIGH) else "medium" if v.severity == Severity.MEDIUM else "low"
                recommendations.append({
                    "rule": v.rule,
                    "priority": priority,
                    "title": self._rule_title(v.rule),
                    "description": v.remediation,
                    "affected_policies": sum(1 for vv in violations if vv.rule == v.rule),
                    "compliance_impact": v.compliance,
                })

        # Sort by priority
        priority_order = {"critical": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: priority_order.get(r["priority"], 3))
        return recommendations

    def _rule_title(self, rule: str) -> str:
        titles = {
            "deny_allow_all": "Block Allow-All Ingress Patterns",
            "deny_missing_pod_selector": "Require Targeted Pod Selectors",
            "deny_no_policy_types": "Enforce Explicit Policy Types",
            "require_namespace": "Mandate Namespace Specification",
            "deny_allow_all_egress": "Block Allow-All Egress Patterns",
            "deny_missing_ports": "Require Port Restrictions",
            "deny_wildcard_cidr": "Block Wildcard CIDR Ranges",
            "require_labels": "Enforce Management Labels",
            "deny_privileged_ports": "Restrict Privileged Port Usage",
        }
        return titles.get(rule, rule.replace("_", " ").title())

    def get_validation_history(self) -> List[Dict[str, Any]]:
        """Return validation history"""
        return self.validation_history

    def get_rules_info(self) -> List[Dict[str, Any]]:
        """Return information about all validation rules"""
        return [
            {
                "id": "deny_allow_all",
                "title": "Block Allow-All Ingress",
                "description": "Prevents NetworkPolicies with allow-all ingress patterns that bypass network segmentation.",
                "severity": "critical",
                "compliance": ["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
            },
            {
                "id": "deny_missing_pod_selector",
                "title": "Require Targeted Pod Selectors",
                "description": "Ensures policies target specific pods rather than all pods in a namespace.",
                "severity": "medium",
                "compliance": ["CIS-K8S", "NIST-800-53"],
            },
            {
                "id": "deny_no_policy_types",
                "title": "Enforce Explicit Policy Types",
                "description": "Requires explicit policyTypes declaration to prevent implicit behavior.",
                "severity": "medium",
                "compliance": ["CIS-K8S"],
            },
            {
                "id": "require_namespace",
                "title": "Mandate Namespace",
                "description": "Requires namespace in metadata to prevent accidental misapplication.",
                "severity": "high",
                "compliance": ["HIPAA", "CIS-K8S", "NIST-800-53"],
            },
            {
                "id": "deny_allow_all_egress",
                "title": "Block Allow-All Egress",
                "description": "Prevents unrestricted outbound traffic that could enable data exfiltration.",
                "severity": "critical",
                "compliance": ["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
            },
            {
                "id": "deny_missing_ports",
                "title": "Require Port Restrictions",
                "description": "Ensures all rules restrict specific ports following least-privilege principle.",
                "severity": "medium",
                "compliance": ["CIS-K8S", "PCI-DSS"],
            },
            {
                "id": "deny_wildcard_cidr",
                "title": "Block Wildcard CIDRs",
                "description": "Blocks 0.0.0.0/0 and ::/0 CIDR ranges that allow traffic from/to any IP.",
                "severity": "critical",
                "compliance": ["HIPAA", "CIS-K8S", "NIST-800-53", "PCI-DSS"],
            },
            {
                "id": "require_labels",
                "title": "Enforce Management Labels",
                "description": "Requires management labels for policy lifecycle tracking.",
                "severity": "low",
                "compliance": ["CIS-K8S"],
            },
            {
                "id": "deny_privileged_ports",
                "title": "Restrict Privileged Ports",
                "description": "Warns about commonly exploited ports (SSH, Telnet, SMB, RDP).",
                "severity": "high",
                "compliance": ["CIS-K8S", "NIST-800-53"],
            },
        ]
