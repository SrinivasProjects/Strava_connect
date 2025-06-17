import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

interface StravaConnectionBannerProps {
  onConnect: () => void;
}

export function StravaConnectionBanner({ onConnect }: StravaConnectionBannerProps) {
  return (
    <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect to Strava</h3>
              <p className="text-orange-100">Sync your activities and start tracking your progress</p>
            </div>
          </div>
          <Button
            onClick={onConnect}
            className="bg-white text-orange-600 hover:bg-orange-50"
          >
            Connect Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
