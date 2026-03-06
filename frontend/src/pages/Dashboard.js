import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Gavel as GavelIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import api from "../services/api";

function Dashboard() {
  const [riskScore, setRiskScore] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [riskRes, healthRes] = await Promise.all([
        api.getRiskScore(),
        api.getSystemHealth(),
      ]);
      setRiskScore(riskRes.data);
      setSystemHealth(healthRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score < 20) return "#4caf50";
    if (score < 40) return "#8bc34a";
    if (score < 60) return "#ffc107";
    if (score < 80) return "#ff9800";
    return "#f44336";
  };

  const riskTrendData = [
    { time: "6h ago", score: 45 },
    { time: "5h ago", score: 42 },
    { time: "4h ago", score: 48 },
    { time: "3h ago", score: 40 },
    { time: "2h ago", score: 35 },
    { time: "1h ago", score: 32 },
    { time: "Now", score: riskScore?.overall_score || 30 },
  ];

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <LinearProgress />
      </Box>
    );
  }

  const sec = systemHealth?.security || {};
  const patients = systemHealth?.patients || {};
  const services = systemHealth?.services || [];
  const summary = systemHealth?.summary || {};

  return (
    <Box>
      {/* ── Eye-catching Header Banner ── */}
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        mb: 3, p: 2.5, borderRadius: 3,
        background: "linear-gradient(135deg, rgba(13,71,161,0.6) 0%, rgba(21,101,192,0.4) 50%, rgba(25,118,210,0.2) 100%)",
        border: "1px solid rgba(144,202,249,0.2)",
        boxShadow: "0 4px 24px rgba(25,118,210,0.15)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{
            width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            boxShadow: "0 0 20px rgba(66,165,245,0.5)",
            animation: "glow 2s ease-in-out infinite alternate",
            "@keyframes glow": { from: { boxShadow: "0 0 10px rgba(66,165,245,0.4)" }, to: { boxShadow: "0 0 25px rgba(66,165,245,0.8)" } },
          }}>
            <ShieldIcon sx={{ color: "#fff", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
              Security Command Center
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#66bb6a", display: "inline-block", animation: "blink 1.5s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
              Live monitoring · OPA enforced · HIPAA compliant
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip icon={<GavelIcon />} label={`${sec.opa_rules_active || 9} OPA Rules Active`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip icon={<LockIcon />} label="HIPAA" size="small" sx={{ bgcolor: "rgba(102,187,106,0.15)", color: "#66bb6a", border: "1px solid rgba(102,187,106,0.4)", fontWeight: 700 }} />
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchData} color="primary" sx={{ bgcolor: "rgba(144,202,249,0.1)", "&:hover": { bgcolor: "rgba(144,202,249,0.2)" } }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ── Row 1: Status Overview Cards ── */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)", position: "relative", overflow: "hidden" }}>
            {/* Decorative ring */}
            <Box sx={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", border: `3px solid ${getRiskColor(riskScore?.overall_score || 0)}33`, }} />
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>Risk Score</Typography>
                <ShieldIcon sx={{ color: getRiskColor(riskScore?.overall_score || 0), filter: `drop-shadow(0 0 6px ${getRiskColor(riskScore?.overall_score || 0)})` }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: getRiskColor(riskScore?.overall_score || 0), textShadow: `0 0 20px ${getRiskColor(riskScore?.overall_score || 0)}66` }}>
                {riskScore?.overall_score?.toFixed(1) || "0.0"}
              </Typography>
              <Chip label={riskScore?.risk_level?.toUpperCase() || "N/A"} size="small" sx={{ mt: 1, fontWeight: 600, backgroundColor: getRiskColor(riskScore?.overall_score || 0), color: "#fff" }} />
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {riskScore?.trend?.direction === "improving" ? (
                  <TrendingDownIcon sx={{ color: "#4caf50", fontSize: 18, mr: 0.5 }} />
                ) : (
                  <TrendingUpIcon sx={{ color: "#f44336", fontSize: 18, mr: 0.5 }} />
                )}
                <Typography variant="caption" sx={{ color: riskScore?.trend?.direction === "improving" ? "#4caf50" : "#f44336" }}>
                  {Math.abs(riskScore?.trend?.change_24h || 0).toFixed(1)}% from yesterday
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography color="text.secondary" variant="body2">Services</Typography>
                <CheckCircleIcon sx={{ color: summary.healthy === summary.total_services ? "#4caf50" : "#ffc107" }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "success.main" }}>
                {summary.healthy || 0}/{summary.total_services || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Healthy services</Typography>
              {summary.down > 0 && <Chip label={`${summary.down} down`} size="small" color="error" sx={{ mt: 0.5 }} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography color="text.secondary" variant="body2">Security Alerts</Typography>
                <WarningIcon sx={{ color: (sec.critical_alerts || 0) > 0 ? "#f44336" : "#ffc107" }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "warning.main" }}>
                {sec.total_drift_events || 0}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                {(sec.critical_alerts || 0) > 0 && <Chip label={`${sec.critical_alerts} critical`} size="small" color="error" />}
                {(sec.high_alerts || 0) > 0 && <Chip label={`${sec.high_alerts} high`} size="small" color="warning" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {sec.policies_total || 0} policies ({sec.policies_deployed || 0} deployed)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography color="text.secondary" variant="body2">Patients</Typography>
                <PeopleIcon color="primary" />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "primary.main" }}>{patients.total || 0}</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                {(patients.admitted || 0) > 0 && <Chip label={`${patients.admitted} admitted`} size="small" color="warning" />}
                {(patients.critical || 0) > 0 && <Chip label={`${patients.critical} critical`} size="small" color="error" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Row 2: Services Health ── */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Service Status
              </Typography>
              {services.map((svc) => (
                <Box
                  key={svc.name}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.5,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {svc.status === "healthy" || svc.status === "monitoring" ? (
                      <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 20 }} />
                    ) : (
                      <ErrorIcon sx={{ color: "#f44336", fontSize: 20 }} />
                    )}
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {svc.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Port {svc.port}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={svc.status}
                      size="small"
                      color={svc.status === "healthy" || svc.status === "monitoring" ? "success" : "error"}
                    />
                    {(svc.name === "Prometheus" || svc.name === "Grafana") && (
                      <Tooltip title={`Open ${svc.name}`}>
                        <IconButton
                          size="small"
                          onClick={() => window.open(svc.url, "_blank")}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              ))}
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open("http://localhost:9090", "_blank")}
                >
                  Prometheus
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open("http://localhost:3001", "_blank")}
                >
                  Grafana
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Row 2b: Risk Components ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Risk Components
              </Typography>
              {riskScore?.components &&
                Object.entries(riskScore.components).map(([key, data]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color:
                            data.score < 30 ? "#4caf50" : data.score < 60 ? "#ffc107" : "#f44336",
                        }}
                      >
                        {data.score?.toFixed(0)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, data.score)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor:
                            data.score < 30 ? "#4caf50" : data.score < 60 ? "#ffc107" : "#f44336",
                        },
                      }}
                    />
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Row 3: Risk Trend Chart ── */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Risk Score Trend
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" domain={[0, 100]} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#90caf9"
                    fill="url(#colorScore)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#90caf9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#90caf9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Row 4: OPA Security Posture Panel ── */}
        <Grid item xs={12}>
          <Card sx={{
            borderTop: "3px solid #42a5f5",
            background: "linear-gradient(135deg, rgba(13,71,161,0.2) 0%, rgba(10,25,41,0.8) 100%)",
          }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GavelIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>OPA Security Posture</Typography>
                  <Chip label="Policy-as-Code" size="small" color="primary" sx={{ fontWeight: 600 }} />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  onClick={() => window.location.href = "/generator"}
                  sx={{ fontWeight: 600 }}
                >
                  Validate Policies
                </Button>
              </Box>
              <Grid container spacing={2}>
                {/* OPA Rules Summary */}
                <Grid item xs={12} md={4}>
                  <Box sx={{
                    p: 2.5, borderRadius: 3, height: "100%",
                    background: "rgba(66,165,245,0.08)",
                    border: "1px solid rgba(66,165,245,0.2)",
                  }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Active OPA Rules</Typography>
                    <Typography variant="h2" sx={{ fontWeight: 800, color: "#42a5f5", mb: 1 }}>
                      {sec.opa_rules_active || 9}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Rego rules enforcing security posture</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {[
                        { label: "Block Allow-All Ingress", color: "#f44336" },
                        { label: "Require Namespaces", color: "#ff9800" },
                        { label: "CIDR Wildcard Check", color: "#f44336" },
                        { label: "Port Restrictions", color: "#ffc107" },
                        { label: "Compliance Labels", color: "#4caf50" },
                      ].map((rule) => (
                        <Box key={rule.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: rule.color, flexShrink: 0 }} />
                          <Typography variant="caption" color="text.secondary">{rule.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Grid>

                {/* Compliance Standards */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2.5, borderRadius: 3, height: "100%", background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.2)" }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Compliance Frameworks</Typography>
                    <Grid container spacing={1.5}>
                      {[
                        { key: "HIPAA", desc: "Healthcare Data Protection", color: "#66bb6a" },
                        { key: "NIST-800-53", desc: "Security Controls", color: "#42a5f5" },
                        { key: "CIS-K8S", desc: "K8s Benchmark", color: "#ab47bc" },
                        { key: "PCI-DSS", desc: "Payment Security", color: "#ffa726" },
                        { key: "SOC2", desc: "Service Security", color: "#26c6da" },
                      ].map((fw) => (
                        <Grid item xs={12} key={fw.key}>
                          <Box sx={{
                            display: "flex", alignItems: "center", gap: 1.5, p: 1, borderRadius: 1.5,
                            bgcolor: `${fw.color}11`, border: `1px solid ${fw.color}33`,
                            transition: "all 0.2s ease",
                            "&:hover": { bgcolor: `${fw.color}22`, transform: "translateX(4px)" },
                          }}>
                            <VerifiedIcon sx={{ color: fw.color, fontSize: 18 }} />
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: fw.color }}>{fw.key}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.65rem" }}>{fw.desc}</Typography>
                            </Box>
                            <Chip label="Monitored" size="small" sx={{ ml: "auto", bgcolor: `${fw.color}22`, color: fw.color, fontSize: "0.6rem", height: 18, fontWeight: 600 }} />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Grid>

                {/* Security Layer Overview */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2.5, borderRadius: 3, height: "100%", background: "rgba(171,71,188,0.08)", border: "1px solid rgba(171,71,188,0.2)" }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Security Layers</Typography>
                    {[
                      { label: "OPA Policy Validation", status: "Active", icon: <GavelIcon sx={{ fontSize: 18, color: "#ab47bc" }} />, score: 100 },
                      { label: "Drift Detection", status: sec.total_drift_events > 0 ? "Alerts" : "Clean", icon: <WarningIcon sx={{ fontSize: 18, color: sec.total_drift_events > 0 ? "#ffa726" : "#66bb6a" }} />, score: sec.total_drift_events > 0 ? 70 : 100 },
                      { label: "Risk Scoring", status: riskScore?.risk_level || "N/A", icon: <ShieldIcon sx={{ fontSize: 18, color: "#42a5f5" }} />, score: 100 - (riskScore?.overall_score || 30) },
                      { label: "Network Policies", status: `${sec.policies_deployed || 0} deployed`, icon: <LockIcon sx={{ fontSize: 18, color: "#4caf50" }} />, score: sec.policies_deployed > 0 ? 85 : 20 },
                      { label: "Kubernetes RBAC", status: "Configured", icon: <SecurityIcon sx={{ fontSize: 18, color: "#ffa726" }} />, score: 80 },
                    ].map((layer) => (
                      <Box key={layer.label} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          {layer.icon}
                          <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>{layer.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{layer.status}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={layer.score}
                          sx={{
                            height: 5, borderRadius: 3,
                            bgcolor: "rgba(255,255,255,0.08)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 3,
                              bgcolor: layer.score > 75 ? "#66bb6a" : layer.score > 50 ? "#ffa726" : "#f44336",
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
