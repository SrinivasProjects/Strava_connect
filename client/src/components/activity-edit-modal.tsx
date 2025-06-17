import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Activity } from "@shared/schema";

interface ActivityEditModalProps {
  activity: Activity;
  onClose: () => void;
  onSave: () => void;
}

export function ActivityEditModal({ activity, onClose, onSave }: ActivityEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: activity.name,
    type: activity.type,
    startDate: new Date(activity.startDate).toISOString().split('T')[0],
    startTime: new Date(activity.startDate).toTimeString().slice(0, 5),
    distance: activity.distance ? (activity.distance / 1000).toString() : '', // Convert to km
    duration: activity.duration ? Math.round(activity.duration / 60).toString() : '', // Convert to minutes
    description: activity.description || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('firebaseToken');
      const uid = localStorage.getItem('firebaseUid');
      
      return fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Firebase-UID': uid || '',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Activity updated",
        description: "Your activity has been successfully updated.",
      });
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update activity. Please try again.",
        variant: "destructive",
      });
      console.error('Update error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {};
    
    if (formData.name !== activity.name) {
      updates.name = formData.name;
    }
    
    if (formData.type !== activity.type) {
      updates.type = formData.type;
    }
    
    if (formData.description !== (activity.description || '')) {
      updates.description = formData.description;
    }

    // Handle date/time changes
    const newDate = new Date(`${formData.startDate}T${formData.startTime}`);
    if (newDate.getTime() !== new Date(activity.startDate).getTime()) {
      updates.startDate = newDate.toISOString();
    }

    // Handle distance changes (convert back to meters)
    const newDistance = formData.distance ? parseFloat(formData.distance) * 1000 : null;
    if (newDistance !== activity.distance) {
      updates.distance = newDistance;
    }

    // Handle duration changes (convert back to seconds)
    const newDuration = formData.duration ? parseInt(formData.duration) * 60 : null;
    if (newDuration !== activity.duration) {
      updates.duration = newDuration;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes",
        description: "No changes were made to the activity.",
      });
      onClose();
      return;
    }

    updateMutation.mutate(updates);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Activity Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="type">Activity Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Run">Run</SelectItem>
                <SelectItem value="Ride">Ride</SelectItem>
                <SelectItem value="Swim">Swim</SelectItem>
                <SelectItem value="Hike">Hike</SelectItem>
                <SelectItem value="Walk">Walk</SelectItem>
                <SelectItem value="Workout">Workout</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distance">Distance (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
