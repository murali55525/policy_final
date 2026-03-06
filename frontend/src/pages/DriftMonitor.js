import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  PlayArrow as AnalyzeIcon,
  CheckCircle as AcknowledgeIcon,
  Done as ResolveIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "../services/api";

function DriftMonitor() {
  const [events, setEvents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.getDriftEvents(100);
      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Failed to fetch drift events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await api.analyzeDrift();
      setAnalysis(response.data);
    } catch (error) {
      console.error("Failed to analyze drift:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const simulateEvents = async () => {
    try {
      await api.simulateDriftEvents(20);
      fetchEvents();
    } catch (error) {
      console.error("Failed to simulate events:", error);
    }
  };

  const acknowledgeEvent = async (eventId) => {
    try {
      await api.acknowledgeDriftEvent(eventId);
      fetchEvents();
    } catch (error) {
      console.error("Failed to acknowledge event:", error);
    }
  };

  const resolveEvent = async (eventId) => {
    try {
      await api.resolveDriftEvent(eventId);
      fetchEvents();
    } catch (error) {
      console.error("Failed to resolve event:", error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "error",
      high: "error",
      medium: "warning",
      low: "success",
      info: "info",
    };
    return colors[severity] || "default";
  };

  const filteredEvents = events.filter((event) => {
    if (severityFilter !== "all" && event.severity !== severityFilter)
      return false;
    if (typeFilter !== "all" && event.event_type !== typeFilter) return false;
    return true;
  });

  const eventTypeData = events.reduce((acc, event) => {
    const existing = acc.find((item) => item.type === event.event_type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type: event.event_type, count: 1 });
    }
    return acc;
  }, []);

  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <LinearProgress />;
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
          Drift Monitor
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchEvents}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AnalyzeIcon />}
            onClick={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
          <Button variant="outlined" color="secondary" onClick={simulateEvents}>
            Simulate Events
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              backgroundColor: "rgba(244, 67, 54, 0.1)",
              border: "1px solid rgba(244, 67, 54, 0.3)",
            }}
          >
            <CardContent>
              <Typography color="error" variant="h6">
                Critical
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {severityCounts.critical || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              backgroundColor: "rgba(255, 152, 0, 0.1)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
            }}
          >
            <CardContent>
              <Typography color="warning.main" variant="h6">
                High
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {severityCounts.high || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              backgroundColor: "rgba(255, 193, 7, 0.1)",
              border: "1px solid rgba(255, 193, 7, 0.3)",
            }}
          >
            <CardContent>
              <Typography sx={{ color: "#ffc107" }} variant="h6">
                Medium
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {severityCounts.medium || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
            }}
          >
            <CardContent>
              <Typography color="success.main" variant="h6">
                Low/Info
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {(severityCounts.low || 0) + (severityCounts.info || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Analysis Results */}
        {analysis && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Analysis Results
                </Typography>
                <Grid container spacing={2}>
                  {analysis.recommendations?.map((rec, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Alert
                        severity={rec.priority === "high" ? "error" : "warning"}
                      >
                        <strong>{rec.action}</strong>
                        <Typography variant="body2">{rec.details}</Typography>
                      </Alert>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Event Type Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Events by Type
              </Typography>
              {eventTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="type"
                      stroke="#9ca3af"
                      tickFormatter={(value) => value.replace(/_/g, ' ')}
                    />
                    <YAxis stroke="#9ca3af" allowDecimals={false} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        borderRadius: 8,
                      }}
                      labelFormatter={(value) => value.replace(/_/g, ' ')}
                    />
                    <Bar dataKey="count" fill="#90caf9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography color="text.secondary">
                    No events to display. Click "Simulate Events" to generate test data.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Filters */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <FilterIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={severityFilter}
                      label="Severity"
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Event Type</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Event Type"
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="unauthorized_connection">
                        Unauthorized Connection
                      </MenuItem>
                      <MenuItem value="suspicious_syscall">
                        Suspicious Syscall
                      </MenuItem>
                      <MenuItem value="config_change">Config Change</MenuItem>
                      <MenuItem value="privilege_escalation">
                        Privilege Escalation
                      </MenuItem>
                      <MenuItem value="file_access">File Access</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Events Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Drift Events ({filteredEvents.length})
              </Typography>
              {filteredEvents.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Source Pod</TableCell>
                      <TableCell>Destination Pod</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell>
                          {new Date(event.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={event.event_type?.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{event.source_pod}</TableCell>
                        <TableCell>{event.destination_pod}</TableCell>
                        <TableCell>
                          <Chip
                            label={event.severity}
                            size="small"
                            color={getSeverityColor(event.severity)}
                          />
                        </TableCell>
                        <TableCell>{event.action}</TableCell>
                        <TableCell>
                          {event.resolved ? (
                            <Chip
                              label="Resolved"
                              size="small"
                              color="success"
                            />
                          ) : event.acknowledged ? (
                            <Chip
                              label="Acknowledged"
                              size="small"
                              color="info"
                            />
                          ) : (
                            <Chip label="New" size="small" color="warning" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Acknowledge">
                            <IconButton
                              size="small"
                              disabled={event.acknowledged}
                              onClick={() => acknowledgeEvent(event.id)}
                            >
                              <AcknowledgeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Resolve">
                            <IconButton size="small" disabled={event.resolved} onClick={() => resolveEvent(event.id)}>
                              <ResolveIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No drift events detected yet.
                  </Typography>
                  <Button variant="outlined" color="secondary" onClick={simulateEvents}>
                    Simulate Events to Test
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DriftMonitor;
