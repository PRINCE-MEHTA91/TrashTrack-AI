import { ClipboardList, Filter, Search } from "lucide-react";
import PlaceholderPage from "../../components/worker/PlaceholderPage";

export default function WorkerTasksPage() {
  return (
    <PlaceholderPage
      id="worker-tasks-page"
      icon={ClipboardList}
      title="Assigned Tasks"
      description="Your full task list will appear here. You'll be able to filter by priority, status, and date — and view complete task details including location and evidence upload."
      badge="Coming Soon"
    />
  );
}
