import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Collapse,
  Tooltip,
  Divider,
  Badge,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  CloudUpload as DeployIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedIcon,
  GppBad as GppBadIcon,
  GppGood as GppGoodIcon,
  Gavel as GavelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import api from "../services/api";

function PolicyGenerator() {
  const [intentName, setIntentName] = useState("my-app-intent");
  const [namespace, setNamespace] = useState("default");
  const [rules, setRules] = useState([
    { from: "frontend", to: "backend", ports: "8080", protocols: "TCP" },
    { from: "backend", to: "database", ports: "5432", protocols: "TCP" },
  ]);
  const [generatedPolicies, setGeneratedPolicies] = useState(null);
  const [generatedYaml, setGeneratedYaml] = useState("");
  const [policyId, setPolicyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [deployDialog, setDeployDialog] = useState(false);
  // OPA Validation state
  const [opaReport, setOpaReport] = useState(null);
  const [opaRules, setOpaRules] = useState([]);
  const [showViolationDetails, setShowViolationDetails] = useState({});
  const [showComplianceDetails, setShowComplianceDetails] = useState(false);

  useEffect(() => {
    api.getOPARules().then((res) => setOpaRules(res.data.rules || [])).catch(() => {});
  }, []);

  const addRule = () => {
    setRules([...rules, { from: "", to: "", ports: "", protocols: "TCP" }]);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  const getSeverityColor = (severity) => {
    const colors = { critical: "#f44336", high: "#ff5722", medium: "#ff9800", low: "#ffc107", info: "#2196f3" };
    return colors[severity] || "#9e9e9e";
  };

  const getSeverityIcon = (severity) => {
    if (severity === "critical") return <ErrorIcon sx={{ color: "#f44336" }} />;
    if (severity === "high") return <WarningIcon sx={{ color: "#ff5722" }} />;
    if (severity === "medium") return <WarningIcon sx={{ color: "#ff9800" }} />;
    if (severity === "low") return <InfoIcon sx={{ color: "#ffc107" }} />;
    return <InfoIcon sx={{ color: "#2196f3" }} />;
  };

  const generatePolicies = async () => {
    setLoading(true);
    setOpaReport(null);
    try {
      const intent = {
        name: intentName,
        namespace: namespace,
        rules: rules.map((rule) => ({
          from_service: rule.from,
          to_service: rule.to,
          ports: rule.ports
            ? rule.ports.split(",").map((p) => parseInt(p.trim()))
            : null,
          protocols: rule.protocols
            ? rule.protocols.split(",").map((p) => p.trim())
            : ["TCP"],
        })),
      };

      const response = await api.generatePolicies(intent);
      setGeneratedPolicies(response.data.policies);
      setGeneratedYaml(response.data.yaml);
      setPolicyId(response.data.policy_id);
      setOpaReport(response.data.opa_validation || null);

      const opaResult = response.data.opa_validation;
      if (opaResult && !opaResult.overall_passed) {
        setSnackbar({
          open: true,
          message: `Generated ${response.data.policies_count} policies — ${opaResult.total_violations} OPA violation(s) found!`,
          severity: "warning",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Generated ${response.data.policies_count} NetworkPolicies — All OPA checks passed!`,
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          "Failed to generate policies: " +
          (error.response?.data?.detail || error.message),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const deployPolicies = async () => {
    if (!policyId) return;
    setDeploying(true);
    try {
      const response = await api.deployPolicies({ policy_id: policyId, namespace });
      if (response.data.blocked_by_opa) {
        setOpaReport(response.data.opa_validation);
        setSnackbar({
          open: true,
          message: "Deployment BLOCKED by OPA: Critical violations detected!",
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Policies deployed successfully to cluster!",
          severity: "success",
        });
      }
      setDeployDialog(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          "Failed to deploy policies: " +
          (error.response?.data?.detail || error.message),
        severity: "error",
      });
    } finally {
      setDeploying(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedYaml);
    setSnackbar({
      open: true,
      message: "YAML copied to clipboard!",
      severity: "success",
    });
  };

  const downloadYaml = () => {
    const blob = new Blob([generatedYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${intentName}-network-policies.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleViolationDetails = (idx) => {
    setShowViolationDetails((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Policy Generator
        </Typography>
        <Chip
          icon={<ShieldIcon />}
          label="OPA Verified"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 600, animation: "pulse 2s infinite", "@keyframes pulse": { "0%": { boxShadow: "0 0 0 0 rgba(102,187,106,0.4)" }, "70%": { boxShadow: "0 0 0 8px rgba(102,187,106,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(102,187,106,0)" } } }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Intent Editor */}
        <Grid item xs={12} md={6}>
          <Card sx={{ border: "1px solid rgba(144,202,249,0.2)", position: "relative", overflow: "visible" }}>
            <Box sx={{ position: "absolute", top: -12, left: 20, px: 2, py: 0.5, bgcolor: "background.paper", borderRadius: 1, border: "1px solid rgba(144,202,249,0.3)" }}>
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}>
                SERVICE INTENT DEFINITION
              </Typography>
            </Box>
            <CardContent sx={{ pt: 4 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Intent Name"
                    value={intentName}
                    onChange={(e) => setIntentName(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Namespace"
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <SecurityIcon fontSize="small" color="primary" /> Communication Rules
              </Typography>

              {rules.map((rule, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: "rgba(144, 202, 249, 0.08)",
                    border: "1px solid rgba(144, 202, 249, 0.24)",
                    transition: "all 0.3s ease",
                    "&:hover": { borderColor: "rgba(144, 202, 249, 0.5)", transform: "translateX(4px)" },
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="From Service" value={rule.from} onChange={(e) => updateRule(index, "from", e.target.value)} size="small" placeholder="frontend" />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="To Service" value={rule.to} onChange={(e) => updateRule(index, "to", e.target.value)} size="small" placeholder="backend" />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField fullWidth label="Ports" value={rule.ports} onChange={(e) => updateRule(index, "ports", e.target.value)} size="small" placeholder="8080" />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField fullWidth label="Protocol" value={rule.protocols} onChange={(e) => updateRule(index, "protocols", e.target.value)} size="small" placeholder="TCP" />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton color="error" onClick={() => removeRule(index)} disabled={rules.length <= 1}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Button startIcon={<AddIcon />} onClick={addRule} variant="outlined" sx={{ mb: 3 }}>
                Add Rule
              </Button>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <GenerateIcon />}
                  onClick={generatePolicies}
                  disabled={loading}
                  fullWidth
                  sx={{ background: "linear-gradient(135deg, #1976d2, #42a5f5)", "&:hover": { background: "linear-gradient(135deg, #1565c0, #1976d2)" } }}
                >
                  {loading ? "Generating & Validating..." : "Generate & Validate with OPA"}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<DeployIcon />}
                  onClick={() => setDeployDialog(true)}
                  disabled={!policyId}
                  fullWidth
                >
                  Deploy to Cluster
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Generated Output */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Generated NetworkPolicies</Typography>
                {generatedYaml && (
                  <Box>
                    <Tooltip title="Copy YAML"><IconButton onClick={copyToClipboard} size="small"><CopyIcon /></IconButton></Tooltip>
                    <Tooltip title="Download YAML"><IconButton onClick={downloadYaml} size="small"><DownloadIcon /></IconButton></Tooltip>
                  </Box>
                )}
              </Box>

              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="YAML" />
                <Tab label="JSON" />
                <Tab label="Summary" />
                <Tab
                  label={
                    <Badge badgeContent={opaReport?.total_violations || 0} color={opaReport?.overall_passed ? "success" : "error"}>
                      OPA Report
                    </Badge>
                  }
                />
              </Tabs>

              {tabValue === 0 && (
                <Box component="pre" sx={{ backgroundColor: "#0d1117", p: 2, borderRadius: 2, overflow: "auto", maxHeight: 500, fontSize: "0.85rem", fontFamily: "monospace" }}>
                  {generatedYaml || "# Generated YAML will appear here..."}
                </Box>
              )}

              {tabValue === 1 && (
                <Box component="pre" sx={{ backgroundColor: "#0d1117", p: 2, borderRadius: 2, overflow: "auto", maxHeight: 500, fontSize: "0.85rem", fontFamily: "monospace" }}>
                  {generatedPolicies ? JSON.stringify(generatedPolicies, null, 2) : "// Generated JSON will appear here..."}
                </Box>
              )}

              {tabValue === 2 && generatedPolicies && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Generated {generatedPolicies.length} NetworkPolicy resources
                  </Alert>
                  {generatedPolicies.map((policy, index) => (
                    <Box key={index} sx={{ p: 2, mb: 1, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{policy.metadata.name}</Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Chip label={policy.metadata.labels?.["policy-type"] || "policy"} size="small" color="primary" />
                        <Chip label={`ns: ${policy.metadata.namespace}`} size="small" variant="outlined" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {/* OPA Validation Report Tab */}
              {tabValue === 3 && (
                <Box>
                  {!opaReport ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <GavelIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                      <Typography color="text.secondary">Generate policies to see OPA validation results</Typography>
                    </Box>
                  ) : (
                    <Box>
                      {/* Security Score Banner */}
                      <Box sx={{
                        p: 3, mb: 3, borderRadius: 3,
                        background: opaReport.overall_passed
                          ? "linear-gradient(135deg, rgba(102,187,106,0.2), rgba(76,175,80,0.1))"
                          : "linear-gradient(135deg, rgba(244,67,54,0.2), rgba(255,87,34,0.1))",
                        border: `1px solid ${opaReport.overall_passed ? "rgba(102,187,106,0.4)" : "rgba(244,67,54,0.4)"}`,
                        textAlign: "center",
                      }}>
                        {opaReport.overall_passed ? (
                          <GppGoodIcon sx={{ fontSize: 56, color: "#66bb6a", mb: 1, filter: "drop-shadow(0 0 8px rgba(102,187,106,0.5))" }} />
                        ) : (
                          <GppBadIcon sx={{ fontSize: 56, color: "#f44336", mb: 1, filter: "drop-shadow(0 0 8px rgba(244,67,54,0.5))" }} />
                        )}
                        <Typography variant="h4" sx={{ fontWeight: 800, color: opaReport.overall_passed ? "#66bb6a" : "#f44336" }}>
                          {opaReport.security_score}/100
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                          OPA Security Score — {opaReport.policies_passed}/{opaReport.total_policies} policies passed
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={opaReport.security_score}
                          sx={{
                            mt: 2, height: 8, borderRadius: 4,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              background: opaReport.security_score > 80
                                ? "linear-gradient(90deg, #66bb6a, #4caf50)"
                                : opaReport.security_score > 50
                                ? "linear-gradient(90deg, #ffa726, #ff9800)"
                                : "linear-gradient(90deg, #f44336, #ff5722)",
                            },
                          }}
                        />
                      </Box>

                      {/* Severity Summary Chips */}
                      <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
                        {Object.entries(opaReport.severity_summary || {}).map(([sev, count]) => (
                          count > 0 && (
                            <Chip
                              key={sev}
                              icon={getSeverityIcon(sev)}
                              label={`${count} ${sev}`}
                              size="small"
                              sx={{ bgcolor: `${getSeverityColor(sev)}22`, color: getSeverityColor(sev), fontWeight: 700, borderColor: getSeverityColor(sev), border: "1px solid" }}
                            />
                          )
                        ))}
                        {opaReport.total_violations === 0 && (
                          <Chip icon={<VerifiedIcon />} label="No Violations" color="success" sx={{ fontWeight: 700 }} />
                        )}
                      </Box>

                      {/* Compliance Framework Status */}
                      <Box sx={{ mb: 3 }}>
                        <Button
                          size="small"
                          onClick={() => setShowComplianceDetails(!showComplianceDetails)}
                          startIcon={<GavelIcon />}
                          endIcon={showComplianceDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{ mb: 1, fontWeight: 600 }}
                        >
                          Compliance Frameworks ({Object.values(opaReport.compliance || {}).filter((c) => c.passed).length}/{Object.keys(opaReport.compliance || {}).length} passed)
                        </Button>
                        <Collapse in={showComplianceDetails}>
                          <Grid container spacing={1}>
                            {Object.entries(opaReport.compliance || {}).map(([key, info]) => (
                              <Grid item xs={6} key={key}>
                                <Box sx={{
                                  p: 1.5, borderRadius: 2,
                                  bgcolor: info.passed ? "rgba(102,187,106,0.1)" : "rgba(244,67,54,0.1)",
                                  border: `1px solid ${info.passed ? "rgba(102,187,106,0.3)" : "rgba(244,67,54,0.3)"}`,
                                }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    {info.passed ? <CheckCircleIcon sx={{ color: "#66bb6a", fontSize: 18 }} /> : <ErrorIcon sx={{ color: "#f44336", fontSize: 18 }} />}
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: info.passed ? "#66bb6a" : "#f44336" }}>{key}</Typography>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                    {info.status} {info.violations > 0 && `(${info.violations} issues)`}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        </Collapse>
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      {/* Violations List */}
                      {opaReport.violations?.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                            <ErrorIcon fontSize="small" color="error" /> Violations ({opaReport.violations.length})
                          </Typography>
                          {opaReport.violations.map((v, idx) => (
                            <Box key={idx} sx={{
                              mb: 1.5, borderRadius: 2, overflow: "hidden",
                              border: `1px solid ${getSeverityColor(v.severity)}44`,
                              bgcolor: `${getSeverityColor(v.severity)}0a`,
                              transition: "all 0.2s ease",
                              "&:hover": { borderColor: `${getSeverityColor(v.severity)}88` },
                            }}>
                              <Box
                                sx={{ p: 2, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 1.5 }}
                                onClick={() => toggleViolationDetails(idx)}
                              >
                                {getSeverityIcon(v.severity)}
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>{v.rule}</Typography>
                                    <Chip label={v.severity} size="small" sx={{ bgcolor: `${getSeverityColor(v.severity)}33`, color: getSeverityColor(v.severity), fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">{v.policy_name}</Typography>
                                </Box>
                                {showViolationDetails[idx] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                              </Box>
                              <Collapse in={showViolationDetails[idx]}>
                                <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                                  <Typography variant="caption" sx={{ display: "block", mb: 1, lineHeight: 1.4 }}>{v.message}</Typography>
                                  <Alert severity="info" variant="outlined" sx={{ py: 0, "& .MuiAlert-message": { fontSize: "0.72rem" } }}>
                                    <strong>Remediation:</strong> {v.remediation}
                                  </Alert>
                                  {v.compliance?.length > 0 && (
                                    <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
                                      {v.compliance.map((c) => (
                                        <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Recommendations */}
                      {opaReport.recommendations?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Recommendations</Typography>
                          {opaReport.recommendations.map((rec, idx) => (
                            <Alert
                              key={idx}
                              severity={rec.priority === "critical" ? "error" : rec.priority === "medium" ? "warning" : "info"}
                              sx={{ mb: 1, "& .MuiAlert-message": { fontSize: "0.78rem" } }}
                            >
                              <strong>{rec.title}</strong> — {rec.description} ({rec.affected_policies} affected)
                            </Alert>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* OPA Active Rules Info */}
        {opaRules.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ borderTop: "3px solid #90caf9" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <GavelIcon color="primary" /> Active OPA Validation Rules
                  <Chip label={`${opaRules.length} rules`} size="small" color="primary" sx={{ ml: 1, fontWeight: 600 }} />
                </Typography>
                <Grid container spacing={2}>
                  {opaRules.map((rule) => (
                    <Grid item xs={12} sm={6} md={4} key={rule.id}>
                      <Box sx={{
                        p: 2, borderRadius: 2, height: "100%",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${getSeverityColor(rule.severity)}33`,
                        transition: "all 0.3s ease",
                        "&:hover": { borderColor: `${getSeverityColor(rule.severity)}66`, transform: "translateY(-2px)", boxShadow: `0 4px 20px ${getSeverityColor(rule.severity)}22` },
                      }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          {getSeverityIcon(rule.severity)}
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{rule.title}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, lineHeight: 1.4 }}>
                          {rule.description}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {rule.compliance?.map((c) => (
                            <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                          ))}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Deploy Confirmation Dialog - Enhanced */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShieldIcon color="success" /> Deploy NetworkPolicies
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deploy {generatedPolicies?.length || 0}{" "}
            NetworkPolicies to namespace <strong>{namespace}</strong>?
          </Typography>
          {opaReport && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: opaReport.overall_passed ? "rgba(102,187,106,0.1)" : "rgba(244,67,54,0.1)", border: `1px solid ${opaReport.overall_passed ? "rgba(102,187,106,0.3)" : "rgba(244,67,54,0.3)"}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                {opaReport.overall_passed
                  ? <GppGoodIcon sx={{ color: "#66bb6a" }} />
                  : <GppBadIcon sx={{ color: "#f44336" }} />}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: opaReport.overall_passed ? "#66bb6a" : "#f44336" }}>
                  OPA Score: {opaReport.security_score}/100 — {opaReport.total_violations} violation(s)
                </Typography>
              </Box>
              {!opaReport.overall_passed && (
                <Typography variant="caption" color="text.secondary">
                  Critical violations will block deployment. High/medium violations are warnings.
                </Typography>
              )}
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will enforce network isolation. Services not explicitly allowed may lose connectivity.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={deployPolicies}
            disabled={deploying}
            startIcon={deploying ? <CircularProgress size={20} /> : <DeployIcon />}
          >
            Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PolicyGenerator;
