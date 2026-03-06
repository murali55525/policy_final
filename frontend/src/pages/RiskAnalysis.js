import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../services/api";

function RiskAnalysis() {
  const [riskData, setRiskData] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [scoreRes, breakdownRes] = await Promise.all([
        api.getRiskScore(),
        api.getRiskBreakdown(),
      ]);
      setRiskData(scoreRes.data);
      setBreakdown(breakdownRes.data);
    } catch (error) {
      console.error("Failed to fetch risk data:", error);
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

  const getStatusIcon = (score) => {
    if (score < 30) return <CheckIcon color="success" />;
    if (score < 60) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const radarData = riskData?.components
    ? [
        {
          category: "Drift Events",
          score: riskData.components.drift_events?.score ?? 0,
          strength: 100 - (riskData.components.drift_events?.score ?? 0),
        },
        {
          category: "Policy Coverage",
          score: riskData.components.policy_coverage?.score ?? 0,
          strength: 100 - (riskData.components.policy_coverage?.score ?? 0),
        },
        {
          category: "Configuration",
          score: riskData.components.configuration?.score ?? 0,
          strength: 100 - (riskData.components.configuration?.score ?? 0),
        },
        {
          category: "Compliance",
          score: riskData.components.compliance?.score ?? 0,
          strength: 100 - (riskData.components.compliance?.score ?? 0),
        },
        {
          category: "Runtime",
          score: riskData.components.runtime_behavior?.score ?? 0,
          strength: 100 - (riskData.components.runtime_behavior?.score ?? 0),
        },
      ]
    : [];

  const trendData = breakdown?.historical_scores || [];

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
          Risk Analysis
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchRiskData}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Overall Risk Score */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              background: `linear-gradient(135deg, ${getRiskColor(riskData?.overall_score || 0)}22 0%, ${getRiskColor(riskData?.overall_score || 0)}11 100%)`,
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <SecurityIcon
                sx={{
                  fontSize: 48,
                  color: getRiskColor(riskData?.overall_score || 0),
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Overall Risk Score
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 700,
                  color: getRiskColor(riskData?.overall_score || 0),
                }}
              >
                {riskData?.overall_score?.toFixed(0) || 0}
              </Typography>
              <Chip
                label={riskData?.risk_level?.toUpperCase() || "UNKNOWN"}
                sx={{
                  mt: 2,
                  backgroundColor: getRiskColor(riskData?.overall_score || 0),
                  color: "#fff",
                  fontWeight: 600,
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 2,
                }}
              >
                {riskData?.trend?.direction === "improving" ? (
                  <>
                    <TrendingDownIcon sx={{ color: "#4caf50", mr: 0.5 }} />
                    <Typography variant="body2" sx={{ color: "#4caf50" }}>
                      Improving (
                      {Math.abs(riskData?.trend?.change_24h || 0).toFixed(1)}%
                      last 24h)
                    </Typography>
                  </>
                ) : (
                  <>
                    <TrendingUpIcon sx={{ color: "#f44336", mr: 0.5 }} />
                    <Typography variant="body2" sx={{ color: "#f44336" }}>
                      Worsening (
                      {Math.abs(riskData?.trend?.change_24h || 0).toFixed(1)}%
                      last 24h)
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Radar Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Security Posture Breakdown
              </Typography>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="category"
                      stroke="#9ca3af"
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      stroke="#9ca3af"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickCount={5}
                    />
                    <Radar
                      name="Security Strength"
                      dataKey="strength"
                      stroke="#4caf50"
                      fill="#4caf50"
                      fillOpacity={0.25}
                    />
                    <Radar
                      name="Risk Score"
                      dataKey="score"
                      stroke="#f44336"
                      fill="#f44336"
                      fillOpacity={0.15}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography color="text.secondary">No risk data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Component Scores */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Risk Components
              </Typography>
              <List>
                {riskData?.components &&
                  Object.entries(riskData.components).map(([key, data]) => (
                    <React.Fragment key={key}>
                      <ListItem>
                        <ListItemIcon>{getStatusIcon(data.score)}</ListItemIcon>
                        <ListItemText
                          primary={key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                          secondary={`${data.description} (Weight: ${(data.weight * 100).toFixed(0)}%)`}
                        />
                        <Box sx={{ minWidth: 100, textAlign: "right" }}>
                          <Typography
                            variant="h6"
                            sx={{ color: getRiskColor(data.score ?? 0) }}
                          >
                            {(data.score ?? 0).toFixed(0)}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={100 - (data.score ?? 0)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "rgba(255,255,255,0.1)",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: getRiskColor(data.score ?? 0),
                              },
                            }}
                          />
                        </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Historical Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                7-Day Risk Trend
              </Typography>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#9ca3af"
                      tickFormatter={(value) => {
                        try {
                          return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        } catch { return value; }
                      }}
                    />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        borderRadius: 8,
                      }}
                      labelFormatter={(value) => {
                        try {
                          return new Date(value).toLocaleDateString();
                        } catch { return value; }
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#90caf9"
                      strokeWidth={2}
                      dot={{ fill: "#90caf9" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                  <Typography color="text.secondary">No historical data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recommendations
              </Typography>
              {riskData?.recommendations?.length > 0 ? (
              <Grid container spacing={2}>
                {riskData.recommendations.map((rec, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Alert
                      severity={
                        rec.priority === "high"
                          ? "error"
                          : rec.priority === "medium"
                            ? "warning"
                            : "info"
                      }
                      icon={
                        rec.priority === "high" ? (
                          <ErrorIcon />
                        ) : rec.priority === "medium" ? (
                          <WarningIcon />
                        ) : (
                          <InfoIcon />
                        )
                      }
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2">{rec.description}</Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                      >
                        Action: {rec.action}
                      </Typography>
                    </Alert>
                  </Grid>
                ))}
              </Grid>
              ) : (
                <Alert severity="success">No recommendations at this time - your security posture looks good!</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Details */}
        {breakdown?.categories && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Security Categories Detail
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(breakdown.categories).map(
                    ([category, data]) => (
                      <Grid item xs={12} md={3} key={category}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: "rgba(144, 202, 249, 0.08)",
                            border: "1px solid rgba(144, 202, 249, 0.24)",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1 }}
                          >
                            {category
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{ color: getRiskColor(data.score ?? 0), mb: 2 }}
                          >
                            {(data.score ?? 0).toFixed(0)}
                          </Typography>
                          {data.details &&
                            Object.entries(data.details).map(([key, value]) => (
                              <Box
                                key={key}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {key.replace(/_/g, " ")}
                                </Typography>
                                <Chip
                                  label={
                                    typeof value === "boolean"
                                      ? value
                                        ? "Yes"
                                        : "No"
                                      : value
                                  }
                                  size="small"
                                  color={
                                    typeof value === "boolean"
                                      ? value
                                        ? "success"
                                        : "error"
                                      : "default"
                                  }
                                />
                              </Box>
                            ))}
                        </Box>
                      </Grid>
                    ),
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default RiskAnalysis;
