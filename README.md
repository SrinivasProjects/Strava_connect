# Strava_connect
# ActivitySync - Strava Activity Manager

## Overview
ActivitySync is a full-stack web application that allows users to sync and manage their Strava activities through a calendar interface. The application provides Google authentication via Firebase and integrates with Strava's API to fetch and display fitness activities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Calendar**: FullCalendar for activity visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Firebase Authentication for user management
- **Session Management**: Express sessions with PostgreSQL store

### Authentication Flow
- Firebase Authentication handles user sign-in/sign-up
- Google OAuth provider for social authentication
- JWT tokens for API authentication
- Custom middleware for protected routes

## Key Components

### Database Schema
- **Users Table**: Stores user profile information (Firebase UID, email, name, profile picture)
- **Strava Tokens Table**: Manages OAuth tokens for Strava integration
- **Activities Table**: Stores synced activity data from Strava

### API Structure
- RESTful API endpoints for user management
- Activity CRUD operations with user isolation
- Strava OAuth callback handling
- Automatic token refresh mechanism

### Frontend Pages
- **Login Page**: Firebase Google authentication
- **Dashboard**: Main interface with activity calendar and management tools
- **Activity Management**: Edit and update activity details

## Data Flow

1. **User Authentication**: User logs in via Google through Firebase
2. **User Registration**: First-time users are registered in PostgreSQL database
3. **Strava Connection**: Users can connect their Strava account via OAuth
4. **Activity Sync**: Activities are fetched from Strava API and stored locally
5. **Calendar Display**: Activities are rendered on a calendar interface
6. **Activity Editing**: Users can modify activity details through modal forms

## External Dependencies

### Third-Party Services
- **Firebase**: User authentication and management
- **Strava API**: Activity data synchronization
- **Neon Database**: Serverless PostgreSQL hosting

### Key Libraries
- **Drizzle ORM**: Type-safe database queries and schema management
- **TanStack Query**: Server state management and caching
- **FullCalendar**: Calendar component for activity visualization
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form state management and validation



### Environment Configuration
- Database connection via DATABASE_URL
- Firebase configuration via environment variables
- Strava OAuth credentials for API integration

## Changelog
- June 17, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.
