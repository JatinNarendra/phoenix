# User Initialization Documentation

## Overview

This document explains how user initialization works across different environments and Telegram data scenarios in the Phoenix Game application.

## Environment Types & User Initialization

### 1. Localhost Development Environment

**Detection**: `isClientDevEnvironment()` function in `app/lib/urlUtils.ts`
**Behavior**:

- Creates dummy WebApp instance with test user (ID: 123456789)
- Bypasses Telegram WebApp validation
- Automatically creates/updates dummy user in Supabase database

**Key Files**:

- `app/context/WebAppContext.tsx` - Creates dummy WebApp with test user data
- `app/lib/userInitializer.ts` - Handles dummy user initialization logic
- `app/hooks/useUser.ts` - Manages user state and initialization flow

### 2. Production Telegram WebApp Environment

**Detection**: Real Telegram WebApp with valid `initData`
**Behavior**:

- Uses actual Telegram WebApp instance
- Validates HMAC signatures for security
- Creates/updates real user data in Supabase

**Key Files**:

- `app/api/telegram/user/route.ts` - Handles user creation/updates via API
- `lib/telegram-server.ts` - Contains `validateTelegramWebAppData()` for HMAC validation
- `app/lib/userInitializer.ts` - Processes real Telegram user data

### 3. Production Non-Telegram Environment

**Detection**: No Telegram WebApp available
**Behavior**:

- Falls back to error handling
- May redirect to appropriate landing page

## Telegram Data Handling

### Real Telegram Data Flow

1. **WebApp Detection**: `checkTelegramApp()` in `WebAppContext.tsx`
2. **Data Validation**: HMAC signature validation via `validateTelegramWebAppData()`
3. **User Creation**: `initializeOrUpdateUser()` with `upsert` operation
4. **Database Storage**: User data stored in `telegram_users` table

### Dummy Data Flow (Localhost)

1. **Environment Check**: `isClientDevEnvironment()` returns true
2. **Dummy WebApp Creation**: Creates mock Telegram WebApp with test user
3. **API Bypass**: Skips HMAC validation for dummy user
4. **Database Sync**: Ensures dummy user exists in Supabase

## Database Schema

### telegram_users Table Structure

- `user_id` (TEXT PRIMARY KEY) - Telegram user ID
- `username`, `first_name`, `last_name` - User profile data
- `game_state` (JSONB) - Complete game progress and state
- `last_login`, `last_active` - Activity timestamps
- `referred_by` - Referral system integration

## Key Components

### Context Providers

- `WebAppProvider` - Provides Telegram WebApp instance
- `GameContext` - Manages game state and user data
- `GameFeaturesProvider` - Handles game features and timers

### Hooks

- `useUser()` - Main user data management hook
- `useReferral()` - Referral system integration

### API Routes

- `/api/telegram/user` - User initialization and updates
- `/api/telegram/user/route.ts` - Handles POST requests for user management

## Security Considerations

### Production Security

- HMAC signature validation for all Telegram data
- Environment-based validation bypass only in development
- Secure API endpoints with proper error handling

### Development Safety

- Dummy user only created in localhost environment
- No real Telegram data processed in development
- Clear separation between dev and production logic

## Error Handling

### Common Scenarios

- Missing Telegram WebApp data
- Invalid HMAC signatures
- Database connection issues
- User not found in database

### Fallback Mechanisms

- Dummy user creation for development
- Graceful degradation for missing data
- Automatic retry mechanisms for API calls

## Configuration

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Database connection
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database authentication
- `NODE_ENV` - Environment detection

### Development Settings

- Dummy user ID: 123456789
- Test username: "testuser"
- Test name: "Test User"

## Maintenance Notes

### Database Resets

- Dummy user automatically recreated on first localhost access
- No manual intervention required for development setup
- Production users preserved through proper backup procedures

### New Environment Setup

- Automatic detection of environment type
- Self-configuring user initialization
- No manual database seeding required
