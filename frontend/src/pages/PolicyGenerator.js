import React, { useState } from "react";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  CloudUpload as DeployIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
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

  const generatePolicies = async () => {
    setLoading(true);
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
      setSnackbar({
        open: true,
        message: `Generated ${response.data.policies_count} NetworkPolicies!`,
        severity: "success",
      });
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
      await api.deployPolicies({ policy_id: policyId, namespace });
      setSnackbar({
        open: true,
        message: "Policies deployed successfully to cluster!",
        severity: "success",
      });
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
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Policy Generator
      </Typography>

      <Grid container spacing={3}>
        {/* Intent Editor */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Service Communication Intent
              </Typography>

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

              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Communication Rules
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
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="From Service"
                        value={rule.from}
                        onChange={(e) =>
                          updateRule(index, "from", e.target.value)
                        }
                        size="small"
                        placeholder="frontend"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="To Service"
                        value={rule.to}
                        onChange={(e) =>
                          updateRule(index, "to", e.target.value)
                        }
                        size="small"
                        placeholder="backend"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        label="Ports"
                        value={rule.ports}
                        onChange={(e) =>
                          updateRule(index, "ports", e.target.value)
                        }
                        size="small"
                        placeholder="8080"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        fullWidth
                        label="Protocol"
                        value={rule.protocols}
                        onChange={(e) =>
                          updateRule(index, "protocols", e.target.value)
                        }
                        size="small"
                        placeholder="TCP"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton
                        color="error"
                        onClick={() => removeRule(index)}
                        disabled={rules.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addRule}
                variant="outlined"
                sx={{ mb: 3 }}
              >
                Add Rule
              </Button>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={
                    loading ? <CircularProgress size={20} /> : <GenerateIcon />
                  }
                  onClick={generatePolicies}
                  disabled={loading}
                  fullWidth
                >
                  Generate Policies
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Generated NetworkPolicies</Typography>
                {generatedYaml && (
                  <Box>
                    <IconButton onClick={copyToClipboard} size="small">
                      <CopyIcon />
                    </IconButton>
                    <IconButton onClick={downloadYaml} size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                sx={{ mb: 2 }}
              >
                <Tab label="YAML" />
                <Tab label="JSON" />
                <Tab label="Summary" />
              </Tabs>

              {tabValue === 0 && (
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: "#0d1117",
                    p: 2,
                    borderRadius: 2,
                    overflow: "auto",
                    maxHeight: 500,
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                  }}
                >
                  {generatedYaml || "# Generated YAML will appear here..."}
                </Box>
              )}

              {tabValue === 1 && (
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: "#0d1117",
                    p: 2,
                    borderRadius: 2,
                    overflow: "auto",
                    maxHeight: 500,
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                  }}
                >
                  {generatedPolicies
                    ? JSON.stringify(generatedPolicies, null, 2)
                    : "// Generated JSON will appear here..."}
                </Box>
              )}

              {tabValue === 2 && generatedPolicies && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Generated {generatedPolicies.length} NetworkPolicy resources
                  </Alert>
                  {generatedPolicies.map((policy, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {policy.metadata.name}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Chip
                          label={
                            policy.metadata.labels?.["policy-type"] || "policy"
                          }
                          size="small"
                          color="primary"
                        />
                        <Chip
                          label={`ns: ${policy.metadata.namespace}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Deploy Confirmation Dialog */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)}>
        <DialogTitle>Deploy NetworkPolicies</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deploy {generatedPolicies?.length || 0}{" "}
            NetworkPolicies to namespace <strong>{namespace}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will enforce network isolation. Services not explicitly allowed
            may lose connectivity.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={deployPolicies}
            disabled={deploying}
            startIcon={
              deploying ? <CircularProgress size={20} /> : <DeployIcon />
            }
          >
            Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PolicyGenerator;
