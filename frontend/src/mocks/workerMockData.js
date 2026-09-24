/**
 * MOCK DATA — Worker Dashboard
 *
 * These are temporary stubs used ONLY while the corresponding backend APIs
 * don't exist yet. Each section is clearly isolated so it can be replaced
 * by a real API call without touching UI components.
 *
 * TODO: Replace each mock with a real API call when the endpoint is ready.
 */

/** TODO: Replace with GET /api/v1/workers/me/stats */
export const MOCK_WORKER_STATS = {
  todayAssigned: 7,
  todayPending: 4,
  todayCompleted: 3,
  highPriority: 2,
  thisWeekCompleted: 18,
  averageResolutionMin: 42,
};

/** TODO: Replace with GET /api/v1/workers/me/zone */
export const MOCK_WORKER_ZONE = {
  name: "Ward 14 – Andheri West",
  municipality: "Brihanmumbai Municipal Corporation",
  shortCode: "BMC-W14",
};

/** TODO: Replace with GET /api/v1/workers/me/tasks?limit=5&status=recent */
export const MOCK_RECENT_ACTIVITY = [
  {
    id: "task-001",
    type: "completed",
    description: "Cleared organic waste near Versova Beach Rd",
    time: "2h ago",
    priority: "HIGH",
  },
  {
    id: "task-002",
    type: "assigned",
    description: "New complaint: bulk waste dumping at Link Road",
    time: "3h ago",
    priority: "MEDIUM",
  },
  {
    id: "task-003",
    type: "completed",
    description: "Plastic waste cleared at Lokhandwala Market",
    time: "5h ago",
    priority: "LOW",
  },
  {
    id: "task-004",
    type: "assigned",
    description: "Hazardous waste report near DN Nagar Metro",
    time: "6h ago",
    priority: "HIGH",
  },
];

/** TODO: Replace with GET /api/v1/notifications?unread=true&limit=1 */
export const MOCK_UNREAD_NOTIFICATIONS = 3;

/** TODO: Replace with GET /api/v1/workers/me/tasks?status=active&limit=1 */
export const MOCK_ACTIVE_TASK = {
  id: "task-005",
  title: "Bulk Waste – Link Road Junction",
  location: "Near D-Mart, Link Road, Andheri West",
  priority: "HIGH",
  assignedAt: "2026-09-24T09:30:00Z",
  wasteType: "BULK",
  estimatedDuration: "45 min",
};
