import { Map } from "lucide-react";
import PlaceholderPage from "../../components/worker/PlaceholderPage";

export default function WorkerMapPage() {
  return (
    <PlaceholderPage
      id="worker-map-page"
      icon={Map}
      title="Task Map"
      description="An interactive map will show your assigned task locations, optimised navigation routes, and nearby complaint pins. Integration with Google Maps or Mapbox is planned."
      badge="Coming Soon"
    />
  );
}
