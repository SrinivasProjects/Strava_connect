import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, logout } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, FolderSync, LogOut, User } from "lucide-react";
import { ActivityCalendar } from "@/components/activity-calendar";
import { StravaConnectionBanner } from "@/components/strava-connection-banner";
import { ActivityEditModal } from "@/components/activity-edit-modal";
import type { Activity as ActivityType } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const queryClient = useQueryClient();

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setLocation('/login');
      } else {
        setUser(firebaseUser);
        // Set auth headers for API requests
        localStorage.setItem('firebaseToken', '');
        localStorage.setItem('firebaseUid', firebaseUser.uid);
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  // Configure query client to include auth headers
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        queryFn: async ({ queryKey }: { queryKey: any }) => {
          const token = localStorage.getItem('firebaseToken');
          const uid = localStorage.getItem('firebaseUid');
          
          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Firebase-UID': uid || '',
            },
          });

          if (!res.ok) {
            if (res.status === 401) {
              setLocation('/login');
              return null;
            }
            const text = (await res.text()) || res.statusText;
            throw new Error(`${res.status}: ${text}`);
          }
          
          return await res.json();
        },
      },
    });
  }, [setLocation, queryClient]);

  // Fetch Strava connection status
  const { data: stravaStatus } = useQuery({
    queryKey: ['/api/strava/status'],
    enabled: !!user,
  });

  // Fetch activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['/api/activities'],
    enabled: !!user,
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => {
      const token = localStorage.getItem('firebaseToken');
      const uid = localStorage.getItem('firebaseUid');
      
      return fetch('/api/activities/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Firebase-UID': uid || '',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('firebaseUid');
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStravaConnect = () => {
    window.location.href = '/api/strava/connect';
  };

  const handleManualSync = () => {
    syncMutation.mutate();
  };

  const activities = (activitiesData as any)?.activities || [];
  const isStravaConnected = (stravaStatus as any)?.connected || false;

  // Calculate stats
  const thisWeekActivities = activities.filter((activity: ActivityType) => {
    const activityDate = new Date(activity.startDate);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return activityDate >= oneWeekAgo;
  }).length;

  const totalDistance = activities.reduce((sum: number, activity: ActivityType) => {
    return sum + (activity.distance || 0);
  }, 0) / 1000; // Convert to km

  const avgDuration = activities.length > 0 
    ? activities.reduce((sum: number, activity: ActivityType) => {
        return sum + (activity.duration || 0);
      }, 0) / activities.length / 60 // Convert to minutes
    : 0;

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ActivitySync</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSync}
                disabled={syncMutation.isPending || !isStravaConnected}
              >
                <FolderSync className={`${syncMutation.isPending ? 'animate-spin' : ''}`} size={16} />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                  ) : (
                    <User size={16} className="text-gray-700" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.displayName || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Strava Connection Banner */}
        {!isStravaConnected && (
          <StravaConnectionBanner onConnect={handleStravaConnect} />
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{thisWeekActivities}</p>
                  <p className="text-sm text-green-600">Activities</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)} km</p>
                  <p className="text-sm text-blue-600">All time</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="text-blue-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(avgDuration)}m</p>
                  <p className="text-sm text-purple-600">Per activity</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="text-purple-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Strava Status</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isStravaConnected ? 'Connected' : 'Not connected'}
                  </p>
                  <p className="text-sm text-gray-500">OAuth status</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="text-orange-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Calendar */}
        <ActivityCalendar
          activities={activities}
          loading={activitiesLoading}
          onActivityClick={setSelectedActivity}
          onManualSync={handleManualSync}
          syncLoading={syncMutation.isPending}
          isStravaConnected={isStravaConnected}
        />

        {/* Activity Edit Modal */}
        {selectedActivity && (
          <ActivityEditModal
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onSave={() => {
              setSelectedActivity(null);
              queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
            }}
          />
        )}
      </div>
    </div>
  );
}
