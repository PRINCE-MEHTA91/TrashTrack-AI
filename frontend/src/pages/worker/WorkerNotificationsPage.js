import { Bell } from "lucide-react";
import PlaceholderPage from "../../components/worker/PlaceholderPage";

export default function WorkerNotificationsPage() {
  return (
    <PlaceholderPage
      id="worker-notifications-page"
      icon={Bell}
      title="Notifications"
      description="Your task assignments, status updates, and system alerts will appear here. Real-time web notifications are planned via browser push or WebSockets."
      badge="3 Unread"
      badgeVariant="primary"
    />
  );
}
