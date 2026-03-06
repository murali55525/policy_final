import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  PolicyOutlined as PolicyIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Speed as SpeedIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";

const drawerWidth = 260;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Patients", icon: <PeopleIcon />, path: "/patients" },
  { text: "Appointments", icon: <EventIcon />, path: "/appointments" },
  { text: "Policy Generator", icon: <SecurityIcon />, path: "/generator" },
  { text: "Drift Monitor", icon: <WarningIcon />, path: "/drift" },
  { text: "Risk Analysis", icon: <AssessmentIcon />, path: "/risk" },
  { text: "Policies", icon: <PolicyIcon />, path: "/policies" },
  { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

const externalLinks = [
  { text: "Prometheus", icon: <SpeedIcon />, url: "http://localhost:9090" },
  { text: "Grafana", icon: <SpeedIcon />, url: "http://localhost:3001" },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          borderRight: "1px solid rgba(255, 255, 255, 0.12)",
        },
      }}
    >
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
          <ShieldIcon />
        </Avatar>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "primary.main" }}
          >
            K8s Security
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Policy Generator
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <List sx={{ px: 2, pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                "&.Mui-selected": {
                  backgroundColor: "rgba(144, 202, 249, 0.16)",
                  "&:hover": {
                    backgroundColor: "rgba(144, 202, 249, 0.24)",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  "& .MuiTypography-root": {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      <Typography variant="caption" color="text.secondary" sx={{ px: 3, py: 1 }}>
        MONITORING
      </Typography>
      <List sx={{ px: 2 }}>
        {externalLinks.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => window.open(item.url, "_blank")}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ color: "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
              <OpenInNewIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: "rgba(102, 187, 106, 0.12)",
            border: "1px solid rgba(102, 187, 106, 0.24)",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: "success.main", fontWeight: 600 }}
          >
            Cluster Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Connected to Minikube
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "success.main",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Monitoring Active
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

export default Sidebar;
