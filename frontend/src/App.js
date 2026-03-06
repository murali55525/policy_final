import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import PolicyGenerator from "./pages/PolicyGenerator";
import DriftMonitor from "./pages/DriftMonitor";
import RiskAnalysis from "./pages/RiskAnalysis";
import Policies from "./pages/Policies";
import Patients from "./pages/Patients";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/generator" element={<PolicyGenerator />} />
            <Route path="/drift" element={<DriftMonitor />} />
            <Route path="/risk" element={<RiskAnalysis />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
