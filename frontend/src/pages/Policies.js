import React, { useState, useEffect } from "react";
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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudUpload as DeployIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import api from "../services/api";

function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await api.listPolicies();
      setPolicies(response.data.policies || []);
    } catch (error) {
      console.error("Failed to fetch policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (policyId) => {
    try {
      await api.deletePolicy(policyId);
      fetchPolicies();
    } catch (error) {
      console.error("Failed to delete policy:", error);
    }
  };

  const deployPolicy = async (policyId, namespace) => {
    try {
      await api.deployPolicies({ policy_id: policyId, namespace });
      fetchPolicies();
    } catch (error) {
      console.error("Failed to deploy policy:", error);
    }
  };

  const viewPolicy = (policy) => {
    setSelectedPolicy(policy);
    setViewDialog(true);
  };

  const downloadPolicy = (policy) => {
    const yaml =
      policy.policies?.map((p) => JSON.stringify(p, null, 2)).join("\n---\n") ||
      "";
    const blob = new Blob([yaml], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.name}-policies.json`;
    a.click();
  };

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
          Policies
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchPolicies}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Policies
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                {policies.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Deployed
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, color: "success.main" }}
              >
                {policies.filter((p) => p.deployed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Pending
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, color: "warning.main" }}
              >
                {policies.filter((p) => !p.deployed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Policies Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Generated Policies
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Namespace</TableCell>
                      <TableCell>Policies Count</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {policies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No policies generated yet. Go to Policy Generator to
                          create policies.
                        </TableCell>
                      </TableRow>
                    ) : (
                      policies.map((policy) => (
                        <TableRow key={policy.id} hover>
                          <TableCell>
                            <Chip
                              label={policy.id}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{policy.name}</TableCell>
                          <TableCell>{policy.namespace}</TableCell>
                          <TableCell>{policy.policies?.length || 0}</TableCell>
                          <TableCell>
                            <Chip
                              label={policy.deployed ? "Deployed" : "Pending"}
                              color={policy.deployed ? "success" : "warning"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(policy.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                onClick={() => viewPolicy(policy)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                onClick={() => downloadPolicy(policy)}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            {!policy.deployed && (
                              <Tooltip title="Deploy">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    deployPolicy(policy.id, policy.namespace)
                                  }
                                >
                                  <DeployIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deletePolicy(policy.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View Policy Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Policy: {selectedPolicy?.name}
          <Chip label={selectedPolicy?.id} size="small" sx={{ ml: 2 }} />
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{ mb: 2 }}
          >
            <Tab label="Intent" />
            <Tab label="Policies" />
          </Tabs>

          {tabValue === 0 && (
            <Box
              component="pre"
              sx={{
                backgroundColor: "#0d1117",
                p: 2,
                borderRadius: 2,
                overflow: "auto",
                maxHeight: 400,
                fontSize: "0.85rem",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(selectedPolicy?.intent, null, 2)}
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
                maxHeight: 400,
                fontSize: "0.85rem",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(selectedPolicy?.policies, null, 2)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadPolicy(selectedPolicy)}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Policies;
