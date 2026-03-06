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
import Chip from "@mui/material/Chip";
import {
  Dashboard as DashboardIcon,
  PolicyOutlined as PolicyIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Speed as SpeedIcon,
  OpenInNew as OpenInNewIcon,
  Gavel as GavelIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";

const pulseKeyframes = `
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    70% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(0.8); opacity: 0; }
  }
  @keyframes glow-dot {
    0%, 100% { box-shadow: 0 0 4px 1px rgba(102,187,106,0.6); }
    50% { box-shadow: 0 0 8px 3px rgba(102,187,106,1); }
  }
`;

const drawerWidth = 260;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
  { text: "Patients", icon: <PeopleIcon />, path: "/patients" },
  { text: "Appointments", icon: <EventIcon />, path: "/appointments" },
  { text: "Policy Generator", icon: <GavelIcon />, path: "/generator", badge: "OPA" },
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
    <>
      <style>{pulseKeyframes}</style>
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
        <Box sx={{ position: "relative" }}>
          <Avatar sx={{
            bgcolor: "primary.main", width: 48, height: 48,
            boxShadow: "0 0 12px rgba(144,202,249,0.5)",
            animation: "glow-dot 2s ease-in-out infinite",
          }}>
            <ShieldIcon />
          </Avatar>
          <Box sx={{
            position: "absolute", top: -2, right: -2,
            width: 12, height: 12, borderRadius: "50%",
            bgcolor: "success.main",
            animation: "glow-dot 1.5s ease-in-out infinite",
          }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
            K8s Security
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Policy Generator</Typography>
            <Chip label="OPA" size="small" color="primary" sx={{ height: 14, fontSize: "0.6rem", "& .MuiChip-label": { px: 0.5 } }} />
          </Box>
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
                transition: "all 0.2s",
                "&.Mui-selected": {
                  backgroundColor: "rgba(144, 202, 249, 0.16)",
                  borderLeft: "3px solid",
                  borderColor: "primary.main",
                  "&:hover": { backgroundColor: "rgba(144, 202, 249, 0.24)" },
                },
                "&:hover": { transform: "translateX(3px)" },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? "primary.main" : "text.secondary",
                  transition: "color 0.2s",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{ "& .MuiTypography-root": { fontWeight: location.pathname === item.path ? 600 : 400 } }}
              />
              {item.badge && (
                <Chip
                  label={item.badge}
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: "0.6rem", "& .MuiChip-label": { px: 0.7 } }}
                />
              )}
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

      <Box sx={{ p: 2 }}>
        <Box sx={{
          p: 2, borderRadius: 2,
          background: "linear-gradient(135deg, rgba(102,187,106,0.12) 0%, rgba(144,202,249,0.08) 100%)",
          border: "1px solid rgba(102, 187, 106, 0.3)",
          position: "relative", overflow: "hidden",
        }}>
          <Box sx={{
            position: "absolute", top: -10, right: -10,
            width: 60, height: 60, borderRadius: "50%",
            bgcolor: "rgba(102,187,106,0.06)",
          }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <VerifiedUserIcon sx={{ color: "success.main", fontSize: 16 }} />
            <Typography variant="subtitle2" sx={{ color: "success.main", fontWeight: 700 }}>
              Cluster Status
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Connected to Minikube
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Box sx={{ position: "relative", width: 8, height: 8 }}>
              <Box sx={{
                position: "absolute", inset: 0,
                borderRadius: "50%", bgcolor: "success.main",
                animation: "glow-dot 2s ease-in-out infinite",
              }} />
              <Box sx={{
                position: "absolute", inset: "-4px",
                borderRadius: "50%",
                border: "2px solid rgba(102,187,106,0.5)",
                animation: "pulse-ring 1.8s ease-out infinite",
              }} />
            </Box>
            <Typography variant="caption" color="text.secondary">Monitoring Active</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75 }}>
            <GavelIcon sx={{ color: "primary.light", fontSize: 13 }} />
            <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600 }}>
              OPA: Active (9 rules)
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
            {["HIPAA","NIST","CIS"].map(f => (
              <Chip key={f} label={f} size="small" color="success" variant="outlined"
                sx={{ height: 14, fontSize: "0.55rem", "& .MuiChip-label": { px: 0.5 } }} />
            ))}
          </Box>
        </Box>
      </Box>
    </Drawer>
    </>
  );
}

export default Sidebar;
