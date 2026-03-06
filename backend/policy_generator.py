
"""
Kubernetes NetworkPolicy Generator
Converts service communication intent into Kubernetes NetworkPolicy manifests
"""

import yaml
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


class PolicyGenerator:
    """
    Generates Kubernetes NetworkPolicy resources from service communication intent.
    Supports advanced features like:
    - Multi-port rules
    - Protocol specification (TCP/UDP)
    - Namespace isolation
    - Default deny policies
    - Egress rules
    """
    
    def __init__(self):
        self.generated_policies = []
    
    def generate(self, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate NetworkPolicies from intent specification.
        
        Args:
            intent: Dictionary containing:
                - name: Name of the intent/policy set
                - namespace: Target namespace
                - rules: List of communication rules
        
        Returns:
            List of Kubernetes NetworkPolicy manifests
        """
        policies = []
        namespace = intent.get("namespace", "default")
        
        # Generate default deny policy for the namespace
        policies.append(self._generate_default_deny(namespace))
        
        # Group rules by destination service
        rules_by_dest = {}
        for rule in intent.get("rules", []):
            dest = rule["to"]
            if dest not in rules_by_dest:
                rules_by_dest[dest] = []
            rules_by_dest[dest].append(rule)
        
        # Generate ingress policy for each destination
        for dest_service, rules in rules_by_dest.items():
            policy = self._generate_ingress_policy(
                dest_service,
                rules,
                namespace,
                intent.get("name", "generated")
            )
            policies.append(policy)
        
        # Generate egress policies for services that need outbound access
        egress_rules = self._extract_egress_rules(intent.get("rules", []))
        for source_service, destinations in egress_rules.items():
            policy = self._generate_egress_policy(
                source_service,
                destinations,
                namespace,
                intent.get("name", "generated")
            )
            policies.append(policy)
        
        self.generated_policies = policies
        return policies
    
    def _generate_default_deny(self, namespace: str) -> Dict[str, Any]:
        """Generate default deny all ingress/egress policy"""
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": "default-deny-all",
                "namespace": namespace,
                "labels": {
                    "app.kubernetes.io/managed-by": "k8s-policy-generator",
                    "policy-type": "default-deny"
                },
                "annotations": {
                    "description": "Default deny all ingress and egress traffic",
                    "generated-at": datetime.now().isoformat()
                }
            },
            "spec": {
                "podSelector": {},
                "policyTypes": ["Ingress", "Egress"]
            }
        }
    
    def _generate_ingress_policy(
        self,
        dest_service: str,
        rules: List[Dict],
        namespace: str,
        intent_name: str
    ) -> Dict[str, Any]:
        """Generate ingress NetworkPolicy for a destination service"""
        
        ingress_rules = []
        
        for rule in rules:
            from_selector = {
                "podSelector": {
                    "matchLabels": {"app": rule["from"]}
                }
            }
            
            # Add namespace selector if cross-namespace
            source_ns = rule.get("namespace", namespace)
            if source_ns != namespace:
                from_selector["namespaceSelector"] = {
                    "matchLabels": {"name": source_ns}
                }
            
            ingress_rule = {"from": [from_selector]}
            
            # Add port specifications if provided
            ports = rule.get("ports")
            protocols = rule.get("protocols", ["TCP"])
            
            if ports:
                ingress_rule["ports"] = []
                for port in ports:
                    for protocol in protocols:
                        ingress_rule["ports"].append({
                            "port": port,
                            "protocol": protocol
                        })
            
            ingress_rules.append(ingress_rule)
        
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": f"allow-ingress-to-{dest_service}",
                "namespace": namespace,
                "labels": {
                    "app.kubernetes.io/managed-by": "k8s-policy-generator",
                    "policy-type": "ingress",
                    "target-service": dest_service,
                    "intent": intent_name
                },
                "annotations": {
                    "description": f"Allow ingress traffic to {dest_service}",
                    "generated-at": datetime.now().isoformat(),
                    "allowed-sources": ",".join([r["from"] for r in rules])
                }
            },
            "spec": {
                "podSelector": {
                    "matchLabels": {"app": dest_service}
                },
                "policyTypes": ["Ingress"],
                "ingress": ingress_rules
            }
        }
    
    def _extract_egress_rules(self, rules: List[Dict]) -> Dict[str, List[Dict]]:
        """Extract and group egress rules by source service"""
        egress_by_source = {}
        
        for rule in rules:
            source = rule["from"]
            if source not in egress_by_source:
                egress_by_source[source] = []
            egress_by_source[source].append({
                "to": rule["to"],
                "ports": rule.get("ports"),
                "protocols": rule.get("protocols", ["TCP"]),
                "namespace": rule.get("namespace", "default")
            })
        
        return egress_by_source
    
    def _generate_egress_policy(
        self,
        source_service: str,
        destinations: List[Dict],
        namespace: str,
        intent_name: str
    ) -> Dict[str, Any]:
        """Generate egress NetworkPolicy for a source service"""
        
        egress_rules = []
        
        for dest in destinations:
            to_selector = {
                "podSelector": {
                    "matchLabels": {"app": dest["to"]}
                }
            }
            
            # Add namespace selector if needed
            dest_ns = dest.get("namespace", namespace)
            if dest_ns != namespace:
                to_selector["namespaceSelector"] = {
                    "matchLabels": {"name": dest_ns}
                }
            
            egress_rule = {"to": [to_selector]}
            
            # Add port specifications
            if dest.get("ports"):
                egress_rule["ports"] = []
                for port in dest["ports"]:
                    for protocol in dest.get("protocols", ["TCP"]):
                        egress_rule["ports"].append({
                            "port": port,
                            "protocol": protocol
                        })
            
            egress_rules.append(egress_rule)
        
        # Allow DNS egress (required for service discovery)
        egress_rules.append({
            "to": [],
            "ports": [
                {"port": 53, "protocol": "UDP"},
                {"port": 53, "protocol": "TCP"}
            ]
        })
        
        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": f"allow-egress-from-{source_service}",
                "namespace": namespace,
                "labels": {
                    "app.kubernetes.io/managed-by": "k8s-policy-generator",
                    "policy-type": "egress",
                    "source-service": source_service,
                    "intent": intent_name
                },
                "annotations": {
                    "description": f"Allow egress traffic from {source_service}",
                    "generated-at": datetime.now().isoformat(),
                    "allowed-destinations": ",".join([d["to"] for d in destinations])
                }
            },
            "spec": {
                "podSelector": {
                    "matchLabels": {"app": source_service}
                },
                "policyTypes": ["Egress"],
                "egress": egress_rules
            }
        }
    
    def generate_cilium_policy(self, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate Cilium NetworkPolicy (advanced L7 support)"""
        policies = []
        namespace = intent.get("namespace", "default")
        
        for rule in intent.get("rules", []):
            policy = {
                "apiVersion": "cilium.io/v2",
                "kind": "CiliumNetworkPolicy",
                "metadata": {
                    "name": f"cilium-{rule['from']}-to-{rule['to']}",
                    "namespace": namespace
                },
                "spec": {
                    "endpointSelector": {
                        "matchLabels": {"app": rule["to"]}
                    },
                    "ingress": [{
                        "fromEndpoints": [{
                            "matchLabels": {"app": rule["from"]}
                        }]
                    }]
                }
            }
            
            # Add L7 rules if HTTP/gRPC
            if rule.get("l7_rules"):
                policy["spec"]["ingress"][0]["toPorts"] = [{
                    "ports": [{"port": str(p), "protocol": "TCP"} for p in rule.get("ports", [80])],
                    "rules": rule["l7_rules"]
                }]
            
            policies.append(policy)
        
        return policies
    
    def to_yaml(self, policies: List[Dict[str, Any]]) -> str:
        """Convert policies to YAML string"""
        yaml_docs = []
        for policy in policies:
            yaml_docs.append(yaml.dump(policy, default_flow_style=False, sort_keys=False))
        return "---\n".join(yaml_docs)
    
    def to_json(self, policies: List[Dict[str, Any]]) -> str:
        """Convert policies to JSON string"""
        return json.dumps(policies, indent=2)
    
    def validate_intent(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Validate intent specification"""
        errors = []
        warnings = []
        
        if "rules" not in intent:
            errors.append("Missing 'rules' field in intent")
        
        if not intent.get("rules"):
            warnings.append("No rules defined in intent")
        
        for i, rule in enumerate(intent.get("rules", [])):
            if "from" not in rule:
                errors.append(f"Rule {i}: Missing 'from' field")
            if "to" not in rule:
                errors.append(f"Rule {i}: Missing 'to' field")
            if rule.get("from") == rule.get("to"):
                warnings.append(f"Rule {i}: Source and destination are the same")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }


# Legacy function for backward compatibility
def generate_policies(intent: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Legacy function - use PolicyGenerator class instead"""
    generator = PolicyGenerator()
    return generator.generate(intent)
