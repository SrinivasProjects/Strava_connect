import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderSync } from "lucide-react";
import type { Activity } from "@shared/schema";

interface ActivityCalendarProps {
  activities: Activity[];
  loading: boolean;
  onActivityClick: (activity: Activity) => void;
  onManualSync: () => void;
  syncLoading: boolean;
  isStravaConnected: boolean;
}

export function ActivityCalendar({
  activities,
  loading,
  onActivityClick,
  onManualSync,
  syncLoading,
  isStravaConnected,
}: ActivityCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstance = useRef<any>(null);

  const getActivityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'run':
        return '#EF4444';
      case 'ride':
      case 'bike':
        return '#3B82F6';
      case 'swim':
        return '#06B6D4';
      default:
        return '#8B5CF6';
    }
  };

  useEffect(() => {
    if (!calendarRef.current || loading) return;

    // Load FullCalendar dynamically
    const loadCalendar = async () => {
      if (typeof window !== 'undefined' && (window as any).FullCalendar) {
        const { Calendar } = (window as any).FullCalendar;
        
        const events = activities.map((activity) => ({
          id: activity.id.toString(),
          title: activity.name,
          start: activity.startDate,
          backgroundColor: getActivityColor(activity.type),
          borderColor: getActivityColor(activity.type),
          extendedProps: {
            activity,
          },
        }));

        if (calendarInstance.current) {
          calendarInstance.current.destroy();
        }

        calendarInstance.current = new Calendar(calendarRef.current, {
          initialView: 'dayGridMonth',
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          },
          events,
          eventClick: (info: any) => {
            onActivityClick(info.event.extendedProps.activity);
          },
          height: 'auto',
          eventDisplay: 'block',
          dayMaxEvents: 3,
          eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            meridiem: false,
          },
        });

        calendarInstance.current.render();
      }
    };

    // Load FullCalendar script if not already loaded
    if (!(window as any).FullCalendar) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
      script.onload = loadCalendar;
      document.head.appendChild(script);
    } else {
      loadCalendar();
    }

    return () => {
      if (calendarInstance.current) {
        calendarInstance.current.destroy();
      }
    };
  }, [activities, loading, onActivityClick]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isStravaConnected || activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderSync className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
            <p className="text-gray-500 mb-6">
              {!isStravaConnected 
                ? "Connect to Strava and sync your activities to get started" 
                : "FolderSync your activities from Strava to see them here"}
            </p>
            {isStravaConnected && (
              <Button onClick={onManualSync} disabled={syncLoading}>
                <FolderSync className={`mr-2 ${syncLoading ? 'animate-spin' : ''}`} size={16} />
                {syncLoading ? 'Syncing...' : 'FolderSync from Strava'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Activity Calendar</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Run</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Ride</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <span>Swim</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Other</span>
            </div>
            <Button
              onClick={onManualSync}
              disabled={syncLoading}
              size="sm"
              className="ml-4"
            >
              <FolderSync className={`mr-2 ${syncLoading ? 'animate-spin' : ''}`} size={16} />
              {syncLoading ? 'Syncing...' : 'Manual FolderSync'}
            </Button>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div ref={calendarRef} className="w-full" />
      </CardContent>
    </Card>
  );
}
