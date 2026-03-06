import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";

function Settings() {
  const [settings, setSettings] = useState({
    apiUrl: "http://localhost:8000",
    refreshInterval: 30,
    enableNotifications: true,
    enableWebSocket: true,
    defaultNamespace: "default",
    autoDeployPolicies: false,
    monitoringEnabled: true,
    falcoEndpoint: "localhost:5060",
    prometheusUrl: "http://localhost:9090",
    grafanaUrl: "http://localhost:3000",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const saveSettings = () => {
    localStorage.setItem("k8s-security-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* API Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                API Configuration
              </Typography>

              <TextField
                fullWidth
                label="Backend API URL"
                value={settings.apiUrl}
                onChange={(e) => handleChange("apiUrl", e.target.value)}
                sx={{ mb: 2 }}
                helperText="URL of the FastAPI backend server"
              />

              <TextField
                fullWidth
                type="number"
                label="Refresh Interval (seconds)"
                value={settings.refreshInterval}
                onChange={(e) =>
                  handleChange("refreshInterval", parseInt(e.target.value))
                }
                sx={{ mb: 2 }}
                helperText="How often to refresh dashboard data"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableWebSocket}
                    onChange={(e) =>
                      handleChange("enableWebSocket", e.target.checked)
                    }
                  />
                }
                label="Enable WebSocket for real-time updates"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Kubernetes Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Kubernetes Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Default Namespace</InputLabel>
                <Select
                  value={settings.defaultNamespace}
                  label="Default Namespace"
                  onChange={(e) =>
                    handleChange("defaultNamespace", e.target.value)
                  }
                >
                  <MenuItem value="default">default</MenuItem>
                  <MenuItem value="kube-system">kube-system</MenuItem>
                  <MenuItem value="monitoring">monitoring</MenuItem>
                  <MenuItem value="demo">demo</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoDeployPolicies}
                    onChange={(e) =>
                      handleChange("autoDeployPolicies", e.target.checked)
                    }
                  />
                }
                label="Auto-deploy generated policies"
              />

              <Divider sx={{ my: 2 }} />

              <Alert severity="info" sx={{ mb: 2 }}>
                Kubernetes connection is configured via KUBECONFIG environment
                variable
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Monitoring Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Monitoring Stack
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.monitoringEnabled}
                    onChange={(e) =>
                      handleChange("monitoringEnabled", e.target.checked)
                    }
                  />
                }
                label="Enable monitoring integration"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Prometheus URL"
                value={settings.prometheusUrl}
                onChange={(e) => handleChange("prometheusUrl", e.target.value)}
                sx={{ mb: 2 }}
                disabled={!settings.monitoringEnabled}
              />

              <TextField
                fullWidth
                label="Grafana URL"
                value={settings.grafanaUrl}
                onChange={(e) => handleChange("grafanaUrl", e.target.value)}
                sx={{ mb: 2 }}
                disabled={!settings.monitoringEnabled}
              />

              <TextField
                fullWidth
                label="Falco gRPC Endpoint"
                value={settings.falcoEndpoint}
                onChange={(e) => handleChange("falcoEndpoint", e.target.value)}
                disabled={!settings.monitoringEnabled}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Notifications
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableNotifications}
                    onChange={(e) =>
                      handleChange("enableNotifications", e.target.checked)
                    }
                  />
                }
                label="Enable browser notifications"
                sx={{ mb: 2 }}
              />

              <Alert severity="warning">
                Browser notifications require permission to be granted
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveSettings}
              size="large"
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Settings;
