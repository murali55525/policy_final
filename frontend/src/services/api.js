import axios from "axios";

// Use relative URLs so requests go through nginx proxy (same origin, no CORS)
const API_BASE_URL = process.env.REACT_APP_API_URL || "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

const api = {
  // Policy Generation
  generatePolicies: (intent) =>
    apiClient.post("/api/v1/policies/generate", intent),

  // Policy Management
  listPolicies: () => apiClient.get("/api/v1/policies"),
  getPolicy: (policyId) => apiClient.get(`/api/v1/policies/${policyId}`),
  deletePolicy: (policyId) => apiClient.delete(`/api/v1/policies/${policyId}`),
  deployPolicies: (data) => apiClient.post("/api/v1/policies/deploy", data),

  // Drift Detection
  getDriftEvents: (limit = 100) =>
    apiClient.get(`/api/v1/drift/events?limit=${limit}`),
  analyzeDrift: () => apiClient.post("/api/v1/drift/analyze"),
  simulateDriftEvents: (count = 10) =>
    apiClient.post(`/api/v1/drift/simulate?count=${count}`),

  // Risk Scoring
  getRiskScore: () => apiClient.get("/api/v1/risk/score"),
  getRiskBreakdown: () => apiClient.get("/api/v1/risk/breakdown"),

  // Metrics
  getMetrics: () => apiClient.get("/api/v1/metrics"),

  // Cluster Info
  getServices: () => apiClient.get("/api/v1/services"),
  getNamespaces: () => apiClient.get("/api/v1/namespaces"),

  // Healthcare
  getHealthcareStats: () => apiClient.get("/api/v1/healthcare/stats"),
  listPatients: () => apiClient.get("/api/v1/healthcare/patients"),
  getPatient: (id) => apiClient.get(`/api/v1/healthcare/patients/${id}`),
  createPatient: (data) => apiClient.post("/api/v1/healthcare/patients", data),
  updatePatient: (id, data) => apiClient.put(`/api/v1/healthcare/patients/${id}`, data),
  deletePatient: (id) => apiClient.delete(`/api/v1/healthcare/patients/${id}`),
  listAppointments: (patientId) =>
    apiClient.get(`/api/v1/healthcare/appointments${patientId ? `?patient_id=${patientId}` : ""}`),
  getAppointment: (id) => apiClient.get(`/api/v1/healthcare/appointments/${id}`),
  createAppointment: (data) => apiClient.post("/api/v1/healthcare/appointments", data),
  updateAppointment: (id, data) => apiClient.put(`/api/v1/healthcare/appointments/${id}`, data),
  deleteAppointment: (id) => apiClient.delete(`/api/v1/healthcare/appointments/${id}`),

  // Drift event actions
  acknowledgeDriftEvent: (eventId) => apiClient.post(`/api/v1/drift/events/${eventId}/acknowledge`),
  resolveDriftEvent: (eventId) => apiClient.post(`/api/v1/drift/events/${eventId}/resolve`),

  // OPA Validation
  validatePoliciesOPA: (policies) => apiClient.post("/api/v1/opa/validate", { policies }),
  validateStoredPolicyOPA: (policyId) => apiClient.post(`/api/v1/opa/validate/${policyId}`),
  getOPARules: () => apiClient.get("/api/v1/opa/rules"),
  getOPAHistory: () => apiClient.get("/api/v1/opa/history"),

  // Health Check
  healthCheck: () => apiClient.get("/health"),
  getSystemHealth: () => apiClient.get("/api/v1/system/health"),
};

export default api;
