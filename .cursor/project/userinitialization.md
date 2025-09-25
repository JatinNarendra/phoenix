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
- Manually removed database entries
- **Account switching data loss** (RESOLVED)

### Fallback Mechanisms

- Dummy user creation for development
- Graceful degradation for missing data
- Automatic retry mechanisms for API calls
- **Re-initialization from cached data** when database entry is missing
- **Account switching protection** to preserve user data

## Re-initialization System

### Overview

When a user's database entry is manually removed (for testing purposes), the system automatically detects this scenario and re-initializes the user with their cached localStorage data.

### Supported Users

The re-initialization system works for:

- **Real Telegram User**: `6042897820` (production user)
- **Dummy User**: `123456789` (localhost testing)

### Re-initialization Flow

1. **Database Check**: System attempts to fetch user data from database
2. **Missing Entry Detection**: If user not found (`PGRST116` error), check if user should be re-initialized
3. **Cache Validation**: Verify user has cached data in localStorage
4. **Database Entry Creation**: Call `initializeOrUpdateUser()` to create new database record
5. **State Restoration**: Save cached game state to the newly created database entry
6. **Immediate Sync**: Force immediate database synchronization

### Implementation Details

**Key Functions**:

- `shouldReinitializeOnMissing()` - Detects users eligible for re-initialization
- `initializeOrUpdateUser()` - Creates database entry with proper user data
- `debouncedSave()` - Saves game state to database

**Files Modified**:

- `app/context/GameContext.tsx` - Main re-initialization logic
- `app/services/timerService.ts` - Auto-tap state fallback
- `app/lib/telegram.ts` - Progress update fallback

### Testing Scenarios

**For Development Testing**:

1. Delete dummy user (`123456789`) entry from `telegram_users` table
2. Refresh localhost - user automatically re-initialized with cached data
3. Database entry recreated with preserved game progress

**For Production Testing**:

1. Delete real user (`6042897820`) entry from `telegram_users` table
2. User accesses app - automatically re-initialized with cached data
3. Database entry recreated with preserved game progress

### Benefits

- **No Data Loss**: User progress preserved during testing
- **Seamless Recovery**: Automatic restoration without manual intervention
- **Testing Flexibility**: Easy to test initialization flows by deleting database entries
- **Unified Behavior**: Both dummy and real users follow same re-initialization logic

## Account Switching Protection

### Issue Identified (RESOLVED)

**Problem**: When users switched between different Telegram accounts, the app was overwriting existing database entries with default game state, causing data loss.

**Root Cause**: The server-side `initializeOrUpdateUser` function in `app/lib/telegram-server.ts` was using `upsert` with `ignoreDuplicates: false`, which always overwrote existing user data with default values.

### Solution Implemented

**Key Changes Made**:

1. **User Existence Check**: Added proper user existence validation before any database operations
2. **Metadata-Only Updates**: For existing users, only update profile metadata (username, first_name, etc.) while preserving `game_state`
3. **Separate Insert Logic**: Use `INSERT` instead of `UPSERT` for new users only
4. **Early Return**: Return immediately for existing users to prevent data overwriting

**Files Modified**:

- `app/lib/telegram-server.ts` - Fixed server-side initialization logic
- `app/context/WebAppContext.tsx` - Enhanced account switch detection
- `app/context/GameContext.tsx` - Improved database state prioritization

### Account Switching Flow (Fixed)

1. **User switches account** → Page refreshes with new `initData`
2. **API called** → `initializeOrUpdateUser` checks if user exists
3. **User exists** → Updates only metadata, preserves `game_state`
4. **GameContext loads** → Reads existing user's data from database
5. **User sees their progress** → No data loss! ✅

### Technical Implementation

**Before (Problematic)**:

```typescript
// ALWAYS created default game state and overwrote existing users
const defaultGameState = { coins: 0, spins: 50, ... };
await supabaseAdmin.from("telegram_users").upsert(userDataToSave, {
  onConflict: "user_id",
  ignoreDuplicates: false, // ❌ This overwrites existing data
});
```

**After (Fixed)**:

```typescript
// Check if user exists first
const { data: existingUser } = await supabaseAdmin
  .from("telegram_users")
  .select("*, game_state")
  .eq("user_id", userData.id.toString())
  .maybeSingle();

// If user exists, just update metadata and preserve game_state
if (existingUser) {
  await supabaseAdmin
    .from("telegram_users")
    .update({
      username: userData.username,
      first_name: userData.first_name,
      // ... other metadata only, NO game_state
    })
    .eq("user_id", userData.id.toString());

  return { success: true, isNewUser: false }; // ✅ Early return
}

// Only create default game state for NEW users
await supabaseAdmin.from("telegram_users").insert(userDataToSave); // ✅ Insert only
```

### Benefits

- **Data Preservation**: Each user's progress is maintained when switching accounts
- **Seamless Experience**: Users can switch between accounts without losing data
- **Proper Separation**: Each Telegram account maintains its own independent game state
- **Development Safety**: Dummy users and real users both protected from data loss

### Testing

**Account Switching Test**:

1. Switch to Account 1 → Should see Account 1's actual progress (not defaults)
2. Switch to Account 2 → Should see Account 2's actual progress (not defaults)
3. Switch back to Account 1 → Should still see Account 1's progress (preserved!)

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
- **Re-initialization system** automatically restores users when database entries are manually removed
- **Account switching protection** prevents data loss during account switches
- No manual intervention required for development setup
- Production users preserved through proper backup procedures

### Testing & Development

- **Easy Testing**: Delete user database entries to test initialization flows
- **Automatic Recovery**: System automatically re-initializes users with cached data
- **No Data Loss**: User progress preserved during testing scenarios
- **Account Switching**: Test account switching to verify data preservation
- **Unified Behavior**: Both dummy and real users follow same re-initialization logic

### New Environment Setup

- Automatic detection of environment type
- Self-configuring user initialization
- No manual database seeding required
- **Re-initialization system** handles missing database entries automatically
