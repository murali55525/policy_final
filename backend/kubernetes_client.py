"""
Kubernetes Client
Handles interactions with Kubernetes cluster
Supports policy deployment, monitoring, and metrics collection
"""

import asyncio
import yaml
import json
import subprocess
from typing import List, Dict, Any, Optional
from datetime import datetime
import os


class KubernetesClient:
    """
    Client for interacting with Kubernetes cluster
    Uses kubectl under the hood for portability
    In production, use kubernetes-client/python for direct API access
    """
    
    def __init__(self, kubeconfig: Optional[str] = None):
        self.kubeconfig = kubeconfig or os.environ.get("KUBECONFIG")
        self._connected = False
    
    def _kubectl(self, *args) -> subprocess.CompletedProcess:
        """Execute kubectl command"""
        cmd = ["kubectl"]
        if self.kubeconfig:
            cmd.extend(["--kubeconfig", self.kubeconfig])
        cmd.extend(args)
        
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
    
    async def check_connection(self) -> bool:
        """Check if connected to cluster"""
        try:
            result = self._kubectl("cluster-info")
            self._connected = result.returncode == 0
            return self._connected
        except Exception:
            self._connected = False
            return False
    
    async def apply_policies(
        self,
        policies: List[Dict[str, Any]],
        namespace: str = "default"
    ) -> Dict[str, Any]:
        """Apply NetworkPolicies to the cluster"""
        results = {
            "success": [],
            "failed": [],
            "timestamp": datetime.now().isoformat()
        }
        
        for policy in policies:
            try:
                # Convert to YAML
                policy_yaml = yaml.dump(policy, default_flow_style=False)
                
                # Apply using kubectl
                process = subprocess.Popen(
                    ["kubectl", "apply", "-f", "-", "-n", namespace],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = process.communicate(input=policy_yaml, timeout=30)
                
                if process.returncode == 0:
                    results["success"].append({
                        "name": policy["metadata"]["name"],
                        "message": stdout.strip()
                    })
                else:
                    results["failed"].append({
                        "name": policy["metadata"]["name"],
                        "error": stderr.strip()
                    })
            except Exception as e:
                results["failed"].append({
                    "name": policy.get("metadata", {}).get("name", "unknown"),
                    "error": str(e)
                })
        
        return results
    
    async def delete_policies(
        self,
        policies: List[Dict[str, Any]],
        namespace: str = "default"
    ) -> Dict[str, Any]:
        """Delete NetworkPolicies from the cluster"""
        results = {
            "success": [],
            "failed": [],
            "timestamp": datetime.now().isoformat()
        }
        
        for policy in policies:
            try:
                policy_name = policy["metadata"]["name"]
                result = self._kubectl(
                    "delete", "networkpolicy", policy_name,
                    "-n", namespace,
                    "--ignore-not-found=true"
                )
                
                if result.returncode == 0:
                    results["success"].append({
                        "name": policy_name,
                        "message": result.stdout.strip() or "Deleted"
                    })
                else:
                    results["failed"].append({
                        "name": policy_name,
                        "error": result.stderr.strip()
                    })
            except Exception as e:
                results["failed"].append({
                    "name": policy.get("metadata", {}).get("name", "unknown"),
                    "error": str(e)
                })
        
        return results
    
    async def get_policies(self, namespace: str = "default") -> List[Dict[str, Any]]:
        """Get all NetworkPolicies in a namespace"""
        try:
            result = self._kubectl(
                "get", "networkpolicy",
                "-n", namespace,
                "-o", "json"
            )
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return data.get("items", [])
            return []
        except Exception:
            return []
    
    async def get_services(self, namespace: str = "") -> List[Dict[str, Any]]:
        """Get all services in the cluster"""
        try:
            cmd = ["get", "services", "-o", "json"]
            if namespace:
                cmd.extend(["-n", namespace])
            else:
                cmd.append("--all-namespaces")
            
            result = self._kubectl(*cmd)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                services = []
                for item in data.get("items", []):
                    services.append({
                        "name": item["metadata"]["name"],
                        "namespace": item["metadata"]["namespace"],
                        "type": item["spec"]["type"],
                        "cluster_ip": item["spec"].get("clusterIP"),
                        "ports": item["spec"].get("ports", []),
                        "selector": item["spec"].get("selector", {})
                    })
                return services
            return []
        except Exception:
            return []
    
    async def get_pods(self, namespace: str = "") -> List[Dict[str, Any]]:
        """Get all pods in the cluster"""
        try:
            cmd = ["get", "pods", "-o", "json"]
            if namespace:
                cmd.extend(["-n", namespace])
            else:
                cmd.append("--all-namespaces")
            
            result = self._kubectl(*cmd)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                pods = []
                for item in data.get("items", []):
                    pods.append({
                        "name": item["metadata"]["name"],
                        "namespace": item["metadata"]["namespace"],
                        "labels": item["metadata"].get("labels", {}),
                        "status": item["status"]["phase"],
                        "ip": item["status"].get("podIP"),
                        "node": item["spec"].get("nodeName")
                    })
                return pods
            return []
        except Exception:
            return []
    
    async def get_namespaces(self) -> List[str]:
        """Get all namespaces"""
        try:
            result = self._kubectl("get", "namespaces", "-o", "json")
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return [
                    item["metadata"]["name"]
                    for item in data.get("items", [])
                ]
            return ["default"]
        except Exception:
            return ["default"]
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get cluster metrics"""
        try:
            # Get node metrics
            node_result = self._kubectl("top", "nodes", "--no-headers")
            
            # Get pod metrics
            pod_result = self._kubectl("top", "pods", "--all-namespaces", "--no-headers")
            
            # Parse results
            nodes = []
            if node_result.returncode == 0:
                for line in node_result.stdout.strip().split("\n"):
                    if line:
                        parts = line.split()
                        if len(parts) >= 5:
                            nodes.append({
                                "name": parts[0],
                                "cpu": parts[1],
                                "cpu_percent": parts[2],
                                "memory": parts[3],
                                "memory_percent": parts[4]
                            })
            
            pods = []
            if pod_result.returncode == 0:
                for line in pod_result.stdout.strip().split("\n"):
                    if line:
                        parts = line.split()
                        if len(parts) >= 4:
                            pods.append({
                                "namespace": parts[0],
                                "name": parts[1],
                                "cpu": parts[2],
                                "memory": parts[3]
                            })
            
            return {
                "nodes": nodes,
                "pods": pods[:20],  # Limit to 20 for performance
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "nodes": [],
                "pods": [],
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_events(
        self,
        namespace: str = "",
        field_selector: str = ""
    ) -> List[Dict[str, Any]]:
        """Get Kubernetes events"""
        try:
            cmd = ["get", "events", "-o", "json"]
            if namespace:
                cmd.extend(["-n", namespace])
            else:
                cmd.append("--all-namespaces")
            if field_selector:
                cmd.extend(["--field-selector", field_selector])
            
            result = self._kubectl(*cmd)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                events = []
                for item in data.get("items", []):
                    events.append({
                        "namespace": item["metadata"]["namespace"],
                        "name": item["metadata"]["name"],
                        "type": item["type"],
                        "reason": item["reason"],
                        "message": item["message"],
                        "first_timestamp": item.get("firstTimestamp"),
                        "last_timestamp": item.get("lastTimestamp"),
                        "count": item.get("count", 1),
                        "involved_object": {
                            "kind": item["involvedObject"]["kind"],
                            "name": item["involvedObject"]["name"]
                        }
                    })
                return events
            return []
        except Exception:
            return []
    
    async def describe_pod(self, name: str, namespace: str = "default") -> str:
        """Get detailed pod description"""
        try:
            result = self._kubectl("describe", "pod", name, "-n", namespace)
            return result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            return str(e)
    
    async def get_pod_logs(
        self,
        name: str,
        namespace: str = "default",
        tail: int = 100
    ) -> str:
        """Get pod logs"""
        try:
            result = self._kubectl(
                "logs", name,
                "-n", namespace,
                f"--tail={tail}"
            )
            return result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            return str(e)


class PrometheusClient:
    """Client for Prometheus metrics queries"""
    
    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        self.base_url = prometheus_url
    
    async def query(self, query: str) -> Dict[str, Any]:
        """Execute PromQL query"""
        # In production, use aiohttp or httpx
        import urllib.request
        import urllib.parse
        
        try:
            url = f"{self.base_url}/api/v1/query?query={urllib.parse.quote(query)}"
            with urllib.request.urlopen(url, timeout=10) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def query_range(
        self,
        query: str,
        start: str,
        end: str,
        step: str = "1m"
    ) -> Dict[str, Any]:
        """Execute PromQL range query"""
        import urllib.request
        import urllib.parse
        
        try:
            params = urllib.parse.urlencode({
                "query": query,
                "start": start,
                "end": end,
                "step": step
            })
            url = f"{self.base_url}/api/v1/query_range?{params}"
            with urllib.request.urlopen(url, timeout=30) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def get_network_policy_metrics(self) -> Dict[str, Any]:
        """Get NetworkPolicy related metrics"""
        queries = {
            "blocked_connections": 'sum(rate(cilium_drop_count_total[5m]))',
            "allowed_connections": 'sum(rate(cilium_forward_count_total[5m]))',
            "policy_verdicts": 'sum by (verdict) (rate(hubble_flows_processed_total[5m]))'
        }
        
        results = {}
        for name, query in queries.items():
            results[name] = await self.query(query)
        
        return results
