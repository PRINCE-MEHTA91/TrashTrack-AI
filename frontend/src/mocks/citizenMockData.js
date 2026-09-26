/**
 * MOCK DATA — Citizen Dashboard
 *
 * Temporary stubs used ONLY while the corresponding backend APIs
 * don't exist yet. Each section is clearly isolated so it can be replaced
 * by a real API call without touching UI components.
 *
 * TODO: Replace each mock with a real API call when the endpoint is ready.
 */

/** TODO: Replace with GET /api/v1/citizen/me/stats */
export const MOCK_CITIZEN_STATS = {
  totalReports: 12,
  pendingReports: 3,
  resolvedReports: 8,
  inProgressReports: 1,
};

/** TODO: Replace with GET /api/v1/citizen/me/zone */
export const MOCK_CITIZEN_ZONE = {
  name: "Ward 7 – Koramangala",
  municipality: "Bruhat Bengaluru Mahanagara Palike",
  shortCode: "BBMP-W7",
};

/** TODO: Replace with GET /api/v1/citizen/me/reports?limit=5 */
export const MOCK_RECENT_REPORTS = [
  {
    id: "RPT-2024-001",
    title: "Garbage pile near park entrance",
    location: "Cubbon Park Gate, MG Road",
    status: "RESOLVED",
    createdAt: "2026-09-20T10:30:00Z",
    wasteType: "ORGANIC",
  },
  {
    id: "RPT-2024-002",
    title: "Plastic waste dumping on roadside",
    location: "Koramangala 5th Block",
    status: "IN_PROGRESS",
    createdAt: "2026-09-22T14:15:00Z",
    wasteType: "PLASTIC",
  },
  {
    id: "RPT-2024-003",
    title: "Construction debris blocking footpath",
    location: "Indiranagar 100ft Road",
    status: "PENDING",
    createdAt: "2026-09-24T09:45:00Z",
    wasteType: "CONSTRUCTION",
  },
  {
    id: "RPT-2024-004",
    title: "Overflowing dustbin near bus stop",
    location: "Bannerghatta Road, Stop 12",
    status: "PENDING",
    createdAt: "2026-09-25T08:00:00Z",
    wasteType: "MIXED",
  },
];

/** TODO: Replace with GET /api/v1/notifications?limit=3&unread=true */
export const MOCK_CITIZEN_NOTIFICATIONS = [
  {
    id: "notif-001",
    title: "Report Resolved",
    message: "Your complaint RPT-2024-001 has been resolved by the assigned worker.",
    time: "2h ago",
    read: false,
    type: "success",
  },
  {
    id: "notif-002",
    title: "Worker Assigned",
    message: "A worker has been assigned to your complaint RPT-2024-002.",
    time: "5h ago",
    read: false,
    type: "info",
  },
  {
    id: "notif-003",
    title: "Report Submitted",
    message: "Your complaint RPT-2024-003 has been submitted and is under review.",
    time: "1d ago",
    read: true,
    type: "info",
  },
];

/** TODO: Replace with GET /api/v1/notifications?unread=true&count=true */
export const MOCK_UNREAD_NOTIFICATIONS = 2;
