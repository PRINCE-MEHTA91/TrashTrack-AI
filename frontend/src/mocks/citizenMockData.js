/**
 * MOCK DATA — Citizen Dashboard
 *
 * Temporary stubs used ONLY while the corresponding backend APIs
 * don't exist yet. Each section is clearly isolated so it can be replaced
 * by a real API call without touching UI components.
 *
 * TODO: Replace each mock with a real API call when the endpoint is ready.
 */


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
