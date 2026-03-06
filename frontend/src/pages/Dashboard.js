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
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
  LocalHospital as HospitalIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          System Health &amp; Security Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* ── Row 1: Status Overview Cards ── */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "linear-gradient(135deg, #1a237e 0%, #283593 100%)" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Risk Score
                </Typography>
                <ShieldIcon sx={{ color: getRiskColor(riskScore?.overall_score || 0) }} />
              </Box>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, mt: 1, color: getRiskColor(riskScore?.overall_score || 0) }}
              >
                {riskScore?.overall_score?.toFixed(1) || "0.0"}
              </Typography>
              <Chip
                label={riskScore?.risk_level?.toUpperCase() || "N/A"}
                size="small"
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  backgroundColor: getRiskColor(riskScore?.overall_score || 0),
                  color: "#fff",
                }}
              />
              <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                {riskScore?.trend?.direction === "improving" ? (
                  <TrendingDownIcon sx={{ color: "#4caf50", fontSize: 18, mr: 0.5 }} />
                ) : (
                  <TrendingUpIcon sx={{ color: "#f44336", fontSize: 18, mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      riskScore?.trend?.direction === "improving" ? "#4caf50" : "#f44336",
                  }}
                >
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
                <Typography color="text.secondary" variant="body2">
                  Services
                </Typography>
                <CheckCircleIcon sx={{ color: summary.healthy === summary.total_services ? "#4caf50" : "#ffc107" }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "success.main" }}>
                {summary.healthy || 0}/{summary.total_services || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Healthy services
              </Typography>
              {summary.down > 0 && (
                <Chip label={`${summary.down} down`} size="small" color="error" sx={{ mt: 0.5 }} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography color="text.secondary" variant="body2">
                  Security Alerts
                </Typography>
                <WarningIcon sx={{ color: (sec.critical_alerts || 0) > 0 ? "#f44336" : "#ffc107" }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "warning.main" }}>
                {sec.total_drift_events || 0}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                {(sec.critical_alerts || 0) > 0 && (
                  <Chip label={`${sec.critical_alerts} critical`} size="small" color="error" />
                )}
                {(sec.high_alerts || 0) > 0 && (
                  <Chip label={`${sec.high_alerts} high`} size="small" color="warning" />
                )}
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
                <Typography color="text.secondary" variant="body2">
                  Patients
                </Typography>
                <PeopleIcon color="primary" />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, color: "primary.main" }}>
                {patients.total || 0}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                {(patients.admitted || 0) > 0 && (
                  <Chip label={`${patients.admitted} admitted`} size="small" color="warning" />
                )}
                {(patients.critical || 0) > 0 && (
                  <Chip label={`${patients.critical} critical`} size="small" color="error" />
                )}
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
      </Grid>
    </Box>
  );
}

export default Dashboard;
