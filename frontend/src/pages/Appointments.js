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
  Event as EventIcon,
  CheckCircle as DoneIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import api from "../services/api";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [form, setForm] = useState({
    patient_id: "",
    doctor: "",
    department: "",
    type: "Check-up",
    date: "",
    status: "scheduled",
    notes: "",
  });
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        api.listAppointments(),
        api.listPatients(),
      ]);
      setAppointments(aRes.data.appointments || []);
      setPatients(pRes.data.patients || []);
    } catch (e) {
      console.error("Failed to fetch appointments:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditAppt(null);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    setForm({
      patient_id: "",
      doctor: "",
      department: "",
      type: "Check-up",
      date: now.toISOString().slice(0, 16),
      status: "scheduled",
      notes: "",
    });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (a) => {
    setEditAppt(a);
    setForm({
      patient_id: a.patient_id,
      doctor: a.doctor,
      department: a.department,
      type: a.type,
      date: a.date ? a.date.slice(0, 16) : "",
      status: a.status,
      notes: a.notes || "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.patient_id) {
      setError("Please select a patient");
      return;
    }
    try {
      if (editAppt) {
        await api.updateAppointment(editAppt.id, form);
      } else {
        await api.createAppointment(form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAppointment(id);
      fetchData();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const getStatusChip = (status) => {
    const map = {
      scheduled: { color: "info", icon: <ScheduleIcon /> },
      "in-progress": { color: "warning", icon: <EventIcon /> },
      completed: { color: "success", icon: <DoneIcon /> },
      cancelled: { color: "default", icon: <CancelIcon /> },
    };
    const cfg = map[status] || map.scheduled;
    return <Chip label={status} size="small" color={cfg.color} icon={cfg.icon} />;
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const scheduled = appointments.filter((a) => a.status === "scheduled").length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const inProgress = appointments.filter((a) => a.status === "in-progress").length;

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Appointments</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined">Refresh</Button>
          <Button startIcon={<AddIcon />} onClick={openAdd} variant="contained">New Appointment</Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2">Total</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{appointments.length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2">Scheduled</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "info.main" }}>{scheduled}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2">In Progress</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>{inProgress}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent>
            <Typography color="text.secondary" variant="body2">Completed</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>{completed}</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Appointment Records</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{a.patient_name}</TableCell>
                    <TableCell>{a.doctor}</TableCell>
                    <TableCell>{a.department}</TableCell>
                    <TableCell><Chip label={a.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{getStatusChip(a.status)}</TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(a)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {appointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">No appointments found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editAppt ? "Edit Appointment" : "New Appointment"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Patient</InputLabel>
                <Select value={form.patient_id} label="Patient" onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  {patients.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} — {p.department}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Doctor" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {["Check-up", "Follow-up", "Lab Work", "Surgery", "Consultation", "Imaging"].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Date & Time"
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editAppt ? "Update" : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Appointments;
