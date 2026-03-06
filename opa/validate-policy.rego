# =============================================================================
# Standalone Rego Policy: Healthcare Network Policy Validation
# =============================================================================
#
# PURPOSE:
#   This is a standalone Rego policy file designed for LOCAL TESTING with the
#   OPA command-line tool (`opa eval`). Unlike the ConstraintTemplate (which
#   is embedded in a Kubernetes YAML and evaluated by Gatekeeper), this file
#   can be used independently to validate NetworkPolicy manifests before they
#   are applied to a cluster.
#
# WHY USE THIS IN ADDITION TO GATEKEEPER?
#   - Shift-left testing: Validate policies in CI/CD pipelines BEFORE
#     they reach the cluster.
#   - Local development: Developers can check their NetworkPolicies locally
#     without needing a running Kubernetes cluster with Gatekeeper.
#   - Comprehensive checks: This file includes additional rules beyond
#     what the ConstraintTemplate enforces (e.g., namespace validation,
#     policyTypes checks).
#
# USAGE:
#   Test against a NetworkPolicy YAML file:
#     opa eval --data validate-policy.rego \
#              --input rejected-policy-example.yaml \
#              "data.healthcare.network_policy"
#
#   Check only deny messages:
#     opa eval --data validate-policy.rego \
#              --input rejected-policy-example.yaml \
#              "data.healthcare.network_policy.deny_allow_all"
#
#   Run all rules and get a combined result:
#     opa eval --data validate-policy.rego \
#              --input rejected-policy-example.yaml \
#              "data.healthcare.network_policy.all_violations"
#
#   Use with conftest (a popular OPA-based tool for testing configs):
#     conftest test rejected-policy-example.yaml --policy validate-policy.rego
#
# INPUT FORMAT:
#   The input is expected to be a standard Kubernetes NetworkPolicy manifest.
#   When using `opa eval --input`, provide the YAML file directly (OPA can
#   parse YAML input).
#
# =============================================================================

package healthcare.network_policy

# =============================================================================
# IMPORTS
# =============================================================================
# future.keywords provides modern Rego syntax including "in", "if",
# "contains", and "every".
# =============================================================================
import future.keywords.in
import future.keywords.if
import future.keywords.contains

# =============================================================================
# RULE 1: deny_allow_all
# =============================================================================
# Blocks NetworkPolicies that have an "allow-all" ingress pattern.
#
# In Kubernetes, these patterns allow unrestricted inbound traffic:
#   - ingress: [{}]     --> empty rule object, matches everything
#   - ingress: []       --> empty list (ambiguous, potentially dangerous)
#   - ingress rule without a "from" field --> no source restriction
#
# This is the most critical rule because allow-all ingress policies
# completely disable network segmentation, exposing services to
# traffic from any source inside or outside the cluster.
#
# HEALTHCARE CONTEXT:
#   HIPAA requires technical safeguards including access controls and
#   network segmentation. An allow-all ingress policy violates these
#   requirements by removing barriers between healthcare data services
#   and potentially untrusted traffic sources.
# =============================================================================

# Detect empty ingress rules: ingress contains {}
deny_allow_all contains msg if {
    # Verify the input is a NetworkPolicy resource
    input.kind == "NetworkPolicy"

    # Iterate over each rule in the ingress array
    some ingress_rule in input.spec.ingress

    # An empty object has zero keys -- it acts as a wildcard allowing
    # all traffic from any source on any port
    count(object.keys(ingress_rule)) == 0

    msg := sprintf(
        "DENY [allow-all-ingress]: NetworkPolicy '%s' in namespace '%s' " +
        "contains an empty ingress rule '{}'. An empty ingress rule allows " +
        "ALL inbound traffic from ANY source on ANY port. Specify explicit " +
        "'from' sources and 'ports' in every ingress rule.",
        [input.metadata.name, input.metadata.namespace]
    )
}

# Detect empty ingress array: ingress is []
deny_allow_all contains msg if {
    input.kind == "NetworkPolicy"

    # Check that the ingress field exists
    ingress := input.spec.ingress

    # An empty array means no ingress rules are defined; combined with
    # policyTypes including "Ingress", this can be either a deny-all
    # (correct interpretation) or a misconfiguration. We flag it to
    # require explicit intent.
    count(ingress) == 0

    msg := sprintf(
        "DENY [empty-ingress-list]: NetworkPolicy '%s' in namespace '%s' " +
        "has an empty ingress list (ingress: []). This is ambiguous. " +
        "If you intend to deny all ingress, remove the 'ingress' field " +
        "entirely and set policyTypes: [\"Ingress\"]. If you intend to " +
        "allow specific traffic, add explicit ingress rules.",
        [input.metadata.name, input.metadata.namespace]
    )
}

# Detect ingress rules without a "from" field (allows traffic from anywhere)
deny_allow_all contains msg if {
    input.kind == "NetworkPolicy"

    some i, ingress_rule in input.spec.ingress

    # The rule has some keys (not completely empty -- that is caught above)
    count(object.keys(ingress_rule)) > 0

    # But it does not have a "from" field, meaning traffic is accepted
    # from any source
    not ingress_rule["from"]

    msg := sprintf(
        "DENY [missing-from-field]: NetworkPolicy '%s' in namespace '%s', " +
        "ingress rule #%d has no 'from' field. Without a 'from' restriction, " +
        "this rule allows traffic from ANY source (any pod, namespace, or " +
        "external IP). Add a 'from' section with podSelector, " +
        "namespaceSelector, or ipBlock to restrict traffic sources.",
        [input.metadata.name, input.metadata.namespace, i + 1]
    )
}

# =============================================================================
# RULE 2: deny_missing_pod_selector
# =============================================================================
# Blocks NetworkPolicies that use an empty podSelector (podSelector: {}).
#
# An empty podSelector matches ALL pods in the namespace. While there are
# legitimate use cases for namespace-wide policies, in a healthcare
# environment each service should have its own targeted NetworkPolicy
# rather than blanket namespace-wide rules.
#
# WHY THIS MATTERS:
#   - A namespace-wide policy affects every pod, including newly deployed
#     ones that may not have been considered when the policy was written.
#   - It is much harder to audit and reason about namespace-wide policies.
#   - Targeted policies (with specific matchLabels) make it clear which
#     services are affected and can be reviewed per-service.
#
# NOTE: If your organization uses namespace-wide deny-all policies as a
# baseline, adjust this rule to only flag empty podSelectors when combined
# with permissive ingress rules.
# =============================================================================

deny_missing_pod_selector contains msg if {
    input.kind == "NetworkPolicy"

    # Check if podSelector is an empty object
    pod_selector := input.spec.podSelector
    count(object.keys(pod_selector)) == 0

    msg := sprintf(
        "DENY [broad-pod-selector]: NetworkPolicy '%s' in namespace '%s' " +
        "uses an empty podSelector (podSelector: {}), which matches ALL " +
        "pods in the namespace. Use 'matchLabels' or 'matchExpressions' " +
        "in the podSelector to target specific pods. Example: " +
        "podSelector: { matchLabels: { app: \"my-service\" } }",
        [input.metadata.name, input.metadata.namespace]
    )
}

# =============================================================================
# RULE 3: deny_no_policy_types
# =============================================================================
# Blocks NetworkPolicies that do not explicitly declare their policyTypes.
#
# The policyTypes field specifies whether the policy applies to ingress,
# egress, or both. If policyTypes is omitted:
#   - Kubernetes defaults to ["Ingress"] if there are ingress rules.
#   - Kubernetes defaults to ["Ingress", "Egress"] if there are egress rules.
#   - If no rules are present, only ["Ingress"] is assumed.
#
# This implicit behavior leads to confusion and potential security gaps.
# Explicitly declaring policyTypes makes the policy intent clear and
# prevents accidental omission of egress controls.
#
# BEST PRACTICE:
#   Always specify both Ingress and Egress in policyTypes, even if you
#   only define rules for one direction. This ensures the other direction
#   is explicitly denied by the policy.
# =============================================================================

deny_no_policy_types contains msg if {
    input.kind == "NetworkPolicy"

    # Check if policyTypes is not defined at all
    not input.spec.policyTypes

    msg := sprintf(
        "DENY [missing-policy-types]: NetworkPolicy '%s' in namespace '%s' " +
        "does not specify 'policyTypes'. Without explicit policyTypes, " +
        "Kubernetes infers them from the presence of ingress/egress rules, " +
        "which can lead to unexpected behavior. Always specify policyTypes " +
        "explicitly, e.g., policyTypes: [\"Ingress\", \"Egress\"].",
        [input.metadata.name, input.metadata.namespace]
    )
}

# Also check for empty policyTypes array
deny_no_policy_types contains msg if {
    input.kind == "NetworkPolicy"

    # policyTypes exists but is empty
    count(input.spec.policyTypes) == 0

    msg := sprintf(
        "DENY [empty-policy-types]: NetworkPolicy '%s' in namespace '%s' " +
        "has an empty policyTypes list. Specify at least one policy type: " +
        "\"Ingress\", \"Egress\", or both.",
        [input.metadata.name, input.metadata.namespace]
    )
}

# =============================================================================
# RULE 4: require_namespace
# =============================================================================
# Blocks NetworkPolicies that do not specify a namespace in their metadata.
#
# While Kubernetes will default to the current namespace context (the one
# set in kubectl's kubeconfig), relying on implicit namespace selection is
# dangerous:
#   - A developer might accidentally apply a policy to the wrong namespace.
#   - CI/CD pipelines may have unpredictable namespace contexts.
#   - Explicit namespaces make manifests self-documenting and portable.
#
# HEALTHCARE CONTEXT:
#   In healthcare environments, namespace isolation is a key security
#   boundary. Applying a NetworkPolicy to the wrong namespace could
#   expose sensitive data services or disrupt critical systems.
# =============================================================================

require_namespace contains msg if {
    input.kind == "NetworkPolicy"

    # Check if namespace is not defined
    not input.metadata.namespace

    msg := sprintf(
        "DENY [missing-namespace]: NetworkPolicy '%s' does not specify " +
        "a namespace in metadata.namespace. Always specify the target " +
        "namespace explicitly to prevent accidental misapplication. " +
        "Example: metadata: { name: \"%s\", namespace: \"healthcare\" }",
        [input.metadata.name, input.metadata.name]
    )
}

# Also check for empty string namespace
require_namespace contains msg if {
    input.kind == "NetworkPolicy"

    # Namespace exists but is an empty string
    input.metadata.namespace == ""

    msg := sprintf(
        "DENY [empty-namespace]: NetworkPolicy '%s' has an empty " +
        "namespace string. Provide a valid namespace name.",
        [input.metadata.name]
    )
}

# =============================================================================
# RULE 5: deny_allow_all_egress
# =============================================================================
# Blocks NetworkPolicies with overly permissive egress rules.
#
# Empty egress rules or egress rules without a "to" field allow outbound
# traffic to ANY destination, including external networks. This can lead
# to data exfiltration or command-and-control communication.
#
# HEALTHCARE CONTEXT:
#   HIPAA requires controlling data flows to prevent unauthorized disclosure
#   of PHI. Unrestricted egress could allow a compromised pod to exfiltrate
#   patient data to an external endpoint.
# =============================================================================

deny_allow_all_egress contains msg if {
    input.kind == "NetworkPolicy"

    some egress_rule in input.spec.egress
    count(object.keys(egress_rule)) == 0

    msg := sprintf(
        "DENY [allow-all-egress]: NetworkPolicy '%s' in namespace '%s' " +
        "contains an empty egress rule '{}'. This allows ALL outbound traffic " +
        "to ANY destination, risking data exfiltration. Specify explicit 'to' " +
        "targets and 'ports' in every egress rule.",
        [input.metadata.name, input.metadata.namespace]
    )
}

deny_allow_all_egress contains msg if {
    input.kind == "NetworkPolicy"

    some i, egress_rule in input.spec.egress
    count(object.keys(egress_rule)) > 0
    not egress_rule["to"]

    msg := sprintf(
        "DENY [missing-to-field]: NetworkPolicy '%s' in namespace '%s', " +
        "egress rule #%d has no 'to' field. Without a 'to' restriction, " +
        "this rule allows traffic to ANY destination. Add a 'to' section " +
        "with podSelector, namespaceSelector, or ipBlock.",
        [input.metadata.name, input.metadata.namespace, i + 1]
    )
}

# =============================================================================
# RULE 6: deny_missing_ports
# =============================================================================
# Warns when ingress or egress rules do not restrict specific ports.
#
# Without port restrictions, allowed traffic can reach ANY port on the
# target pod. This violates the principle of least privilege and increases
# the attack surface if a service is compromised.
# =============================================================================

deny_missing_ports contains msg if {
    input.kind == "NetworkPolicy"

    some i, ingress_rule in input.spec.ingress
    count(object.keys(ingress_rule)) > 0
    ingress_rule["from"]
    not ingress_rule["ports"]

    msg := sprintf(
        "DENY [missing-ingress-ports]: NetworkPolicy '%s' in namespace '%s', " +
        "ingress rule #%d allows traffic but does not restrict ports. Without " +
        "a 'ports' field, ALL ports are open to the allowed sources. Specify " +
        "explicit ports, e.g., ports: [{protocol: TCP, port: 8080}].",
        [input.metadata.name, input.metadata.namespace, i + 1]
    )
}

deny_missing_ports contains msg if {
    input.kind == "NetworkPolicy"

    some i, egress_rule in input.spec.egress
    count(object.keys(egress_rule)) > 0
    egress_rule["to"]
    not egress_rule["ports"]

    msg := sprintf(
        "DENY [missing-egress-ports]: NetworkPolicy '%s' in namespace '%s', " +
        "egress rule #%d allows traffic but does not restrict ports. Without " +
        "a 'ports' field, ALL ports are open to the allowed destinations. " +
        "Specify explicit ports.",
        [input.metadata.name, input.metadata.namespace, i + 1]
    )
}

# =============================================================================
# RULE 7: deny_invalid_port_range
# =============================================================================
# Blocks NetworkPolicies with ports outside the valid TCP/UDP range (1-65535).
# =============================================================================

deny_invalid_port_range contains msg if {
    input.kind == "NetworkPolicy"

    some ingress_rule in input.spec.ingress
    some port_entry in ingress_rule.ports
    port_num := port_entry.port
    is_number(port_num)
    port_num < 1

    msg := sprintf(
        "DENY [invalid-port]: NetworkPolicy '%s' in namespace '%s' " +
        "specifies port %d which is below the valid range (1-65535).",
        [input.metadata.name, input.metadata.namespace, port_num]
    )
}

deny_invalid_port_range contains msg if {
    input.kind == "NetworkPolicy"

    some ingress_rule in input.spec.ingress
    some port_entry in ingress_rule.ports
    port_num := port_entry.port
    is_number(port_num)
    port_num > 65535

    msg := sprintf(
        "DENY [invalid-port]: NetworkPolicy '%s' in namespace '%s' " +
        "specifies port %d which is above the valid range (1-65535).",
        [input.metadata.name, input.metadata.namespace, port_num]
    )
}

# =============================================================================
# RULE 8: deny_missing_api_version
# =============================================================================
# Ensures the NetworkPolicy uses the correct apiVersion.
# =============================================================================

deny_missing_api_version contains msg if {
    input.kind == "NetworkPolicy"
    not input.apiVersion

    msg := sprintf(
        "DENY [missing-api-version]: NetworkPolicy '%s' does not specify " +
        "an apiVersion. Use 'networking.k8s.io/v1'.",
        [input.metadata.name]
    )
}

deny_missing_api_version contains msg if {
    input.kind == "NetworkPolicy"
    input.apiVersion
    input.apiVersion != "networking.k8s.io/v1"

    msg := sprintf(
        "DENY [wrong-api-version]: NetworkPolicy '%s' uses apiVersion '%s'. " +
        "The correct apiVersion for NetworkPolicy is 'networking.k8s.io/v1'.",
        [input.metadata.name, input.apiVersion]
    )
}

# =============================================================================
# RULE 9: deny_missing_name
# =============================================================================
# Blocks policies without a metadata.name field.
# =============================================================================

deny_missing_name contains msg if {
    input.kind == "NetworkPolicy"
    not input.metadata.name

    msg := "DENY [missing-name]: NetworkPolicy does not specify a " +
        "metadata.name. Every Kubernetes resource must have a unique name."
}

deny_missing_name contains msg if {
    input.kind == "NetworkPolicy"
    input.metadata.name == ""

    msg := "DENY [empty-name]: NetworkPolicy has an empty metadata.name. " +
        "Provide a meaningful name for identification and auditing."
}

# =============================================================================
# RULE 10: warn_wide_cidr (advisory)
# =============================================================================
# Flags NetworkPolicies that use overly broad CIDR blocks (e.g., 0.0.0.0/0)
# which allow traffic from/to the entire internet.
# =============================================================================

warn_wide_cidr contains msg if {
    input.kind == "NetworkPolicy"

    some ingress_rule in input.spec.ingress
    some from_entry in ingress_rule["from"]
    cidr := from_entry.ipBlock.cidr
    cidr == "0.0.0.0/0"

    msg := sprintf(
        "WARN [wide-cidr-ingress]: NetworkPolicy '%s' in namespace '%s' " +
        "allows ingress from CIDR 0.0.0.0/0 (entire internet). This is " +
        "extremely permissive. Restrict to specific IP ranges.",
        [input.metadata.name, input.metadata.namespace]
    )
}

warn_wide_cidr contains msg if {
    input.kind == "NetworkPolicy"

    some egress_rule in input.spec.egress
    some to_entry in egress_rule["to"]
    cidr := to_entry.ipBlock.cidr
    cidr == "0.0.0.0/0"

    msg := sprintf(
        "WARN [wide-cidr-egress]: NetworkPolicy '%s' in namespace '%s' " +
        "allows egress to CIDR 0.0.0.0/0 (entire internet). This risks " +
        "data exfiltration. Restrict to specific IP ranges.",
        [input.metadata.name, input.metadata.namespace]
    )
}

# =============================================================================
# HELPER: all_violations
# =============================================================================
# Aggregates all violations from all rules into a single set for easy
# consumption. Use this to get a complete report of all policy issues.
#
# Usage:
#   opa eval --data validate-policy.rego \
#            --input my-policy.yaml \
#            "data.healthcare.network_policy.all_violations"
# =============================================================================

all_violations contains msg if {
    some msg in deny_allow_all
}

all_violations contains msg if {
    some msg in deny_missing_pod_selector
}

all_violations contains msg if {
    some msg in deny_no_policy_types
}

all_violations contains msg if {
    some msg in require_namespace
}

all_violations contains msg if {
    some msg in deny_allow_all_egress
}

all_violations contains msg if {
    some msg in deny_missing_ports
}

all_violations contains msg if {
    some msg in deny_invalid_port_range
}

all_violations contains msg if {
    some msg in deny_missing_api_version
}

all_violations contains msg if {
    some msg in deny_missing_name
}

# =============================================================================
# HELPER: all_warnings
# =============================================================================
# Aggregates non-blocking warnings (advisory checks).
# =============================================================================

all_warnings contains msg if {
    some msg in warn_wide_cidr
}

# =============================================================================
# HELPER: policy_is_valid
# =============================================================================
# Returns true only if there are zero violations across all rules.
# Useful for CI/CD gating -- fail the pipeline if this evaluates to false.
#
# Usage:
#   opa eval --data validate-policy.rego \
#            --input my-policy.yaml \
#            "data.healthcare.network_policy.policy_is_valid"
# =============================================================================

policy_is_valid if {
    count(all_violations) == 0
}
