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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import api from "../services/api";

const emptyPatient = {
  name: "",
  age: "",
  gender: "",
  blood_type: "",
  condition: "",
  department: "",
  status: "active",
  doctor: "",
};

function Patients() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [form, setForm] = useState(emptyPatient);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        api.listPatients(),
        api.getHealthcareStats(),
      ]);
      setPatients(pRes.data.patients || []);
      setStats(sRes.data);
    } catch (e) {
      console.error("Failed to fetch patients:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditPatient(null);
    setForm(emptyPatient);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditPatient(p);
    setForm({ ...p });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Patient name is required");
      return;
    }
    try {
      if (editPatient) {
        await api.updatePatient(editPatient.id, form);
      } else {
        await api.createPatient(form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePatient(id);
      fetchData();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const getStatusColor = (status) => {
    const map = { active: "success", admitted: "warning", critical: "error", discharged: "default" };
    return map[status] || "default";
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Patients</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined">Refresh</Button>
          <Button startIcon={<AddIcon />} onClick={openAdd} variant="contained">Add Patient</Button>
        </Box>
      </Box>

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <PersonIcon color="primary" fontSize="large" />
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Patients</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.total_patients}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <HospitalIcon color="warning" fontSize="large" />
                <Box>
                  <Typography color="text.secondary" variant="body2">Admitted</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>{stats.admitted}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <WarningIcon color="error" fontSize="large" />
                <Box>
                  <Typography color="text.secondary" variant="body2">Critical</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main" }}>{stats.critical}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Departments</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "info.main" }}>{stats.departments?.length || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Patients table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Patient Records ({patients.length})</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Blood Type</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell>{p.age}</TableCell>
                    <TableCell>{p.gender}</TableCell>
                    <TableCell><Chip label={p.blood_type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{p.condition}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.doctor}</TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" color={getStatusColor(p.status)} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {patients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No patients found. Add one to get started.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editPatient ? "Edit Patient" : "Add New Patient"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}>
              <TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || "" })} size="small" />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={form.gender} label="Gender" onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Blood Type</InputLabel>
                <Select value={form.blood_type} label="Blood Type" onChange={(e) => setForm({ ...form, blood_type: e.target.value })}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                    <MenuItem key={bt} value={bt}>{bt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Doctor" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="admitted">Admitted</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="discharged">Discharged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editPatient ? "Update" : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Patients;
