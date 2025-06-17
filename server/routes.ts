import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertActivitySchema, updateActivitySchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    firebaseUid: string;
    email: string;
    name: string;
  };
  session?: any;
}

// Middleware to verify Firebase token and get user
async function authenticateUser(req: AuthenticatedRequest, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // In a real app, verify the Firebase token here
    // For now, extract user info from token payload (would be done by Firebase Admin SDK)
    const token = authHeader.split(' ')[1];
    
    // Mock verification - in production, use Firebase Admin SDK
    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const firebaseUid = req.headers['x-firebase-uid'] as string;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Firebase UID required' });
    }

    const user = await storage.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      let user = await storage.getUserByFirebaseUid(userData.firebaseUid);
      
      if (!user) {
        // Create new user
        user = await storage.createUser(userData);
      }
      
      res.json({ user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // Strava OAuth routes
  app.get('/api/strava/connect', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/strava/callback`;
    
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=activity:read_all,activity:write`;
    
    // Store user ID in session for callback
    if (!req.session) req.session = {};
    req.session.userId = req.user!.id;
    
    res.redirect(stravaAuthUrl);
  });

  app.get('/api/strava/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        return res.redirect('/dashboard?error=strava_denied');
      }

      if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
      }

      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(400).json({ error: 'No user session found' });
      }

      // Exchange code for tokens
      const clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID;
      const clientSecret = process.env.STRAVA_CLIENT_SECRET;
      
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.message || 'Failed to exchange code for tokens');
      }

      // Save tokens to database
      await storage.upsertStravaToken({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000),
        stravaUserId: tokenData.athlete.id.toString(),
      });

      res.redirect('/dashboard?connected=true');
    } catch (error) {
      console.error('Strava callback error:', error);
      res.redirect('/dashboard?error=strava_error');
    }
  });

  app.get('/api/strava/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token = await storage.getStravaTokenByUserId(req.user!.id);
      res.json({ connected: !!token });
    } catch (error) {
      console.error('Strava status error:', error);
      res.status(500).json({ error: 'Failed to check Strava connection' });
    }
  });

  // Activity routes
  app.get('/api/activities', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const activities = await storage.getActivitiesByUserId(req.user!.id);
      res.json({ activities });
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  app.post('/api/activities/sync', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token = await storage.getStravaTokenByUserId(req.user!.id);
      if (!token) {
        return res.status(400).json({ error: 'Strava not connected' });
      }

      // Check if token is expired and refresh if needed
      if (new Date() >= token.expiresAt) {
        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token: token.refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          await storage.updateStravaToken(req.user!.id, {
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token,
            expiresAt: new Date(refreshData.expires_at * 1000),
          });
        }
      }

      // Fetch activities from Strava
      const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
        },
      });

      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch activities from Strava');
      }

      const stravaActivities = await activitiesResponse.json();
      
      // Save activities to database
      let savedCount = 0;
      for (const activity of stravaActivities) {
        try {
          await storage.upsertActivity({
            userId: req.user!.id,
            stravaId: activity.id.toString(),
            name: activity.name,
            type: activity.type,
            startDate: new Date(activity.start_date),
            distance: activity.distance,
            duration: activity.moving_time,
            description: activity.description || null,
          });
          savedCount++;
        } catch (error) {
          console.error(`Failed to save activity ${activity.id}:`, error);
        }
      }

      res.json({ 
        message: `Synced ${savedCount} activities`,
        totalFetched: stravaActivities.length,
        saved: savedCount 
      });
    } catch (error) {
      console.error('Sync activities error:', error);
      res.status(500).json({ error: 'Failed to sync activities' });
    }
  });

  app.patch('/api/activities/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const activityId = parseInt(req.params.id);
      const updates = updateActivitySchema.parse(req.body);

      // Get the activity to ensure user owns it
      const activities = await storage.getActivitiesByUserId(req.user!.id);
      const activity = activities.find(a => a.id === activityId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Update in database
      const updatedActivity = await storage.updateActivity(activityId, updates);
      
      if (!updatedActivity) {
        return res.status(500).json({ error: 'Failed to update activity' });
      }

      // Update in Strava if connected
      const token = await storage.getStravaTokenByUserId(req.user!.id);
      if (token) {
        try {
          const stravaUpdateData: any = {};
          if (updates.name) stravaUpdateData.name = updates.name;
          if (updates.type) stravaUpdateData.type = updates.type;
          if (updates.description) stravaUpdateData.description = updates.description;

          await fetch(`https://www.strava.com/api/v3/activities/${activity.stravaId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stravaUpdateData),
          });
        } catch (error) {
          console.error('Failed to update activity in Strava:', error);
          // Continue even if Strava update fails
        }
      }

      res.json({ activity: updatedActivity });
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
