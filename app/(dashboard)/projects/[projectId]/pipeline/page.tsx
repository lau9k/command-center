import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function ProjectPipelinePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pipeline</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Pipeline View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pipeline management is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
