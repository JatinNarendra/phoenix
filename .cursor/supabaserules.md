# Supabase Database Rules and Best Practices

## Core Principles

### 1. Single Source of Truth

- **Main Schema File**: `phoenix_schema_safe_deploy.sql` is the ONLY authoritative database schema file
- All database structure, tables, indexes, RLS policies, and functions must be defined in this file
- Never create duplicate schema files or scattered SQL files across the project

### 2. TypeScript Type Safety

#### NEVER Use `as any`

- **NEVER** add `as any` to fix Supabase type errors, especially for JSONB columns
- **NEVER** use type assertions like `(supabase as any)` or `(data as any)`
- Preserve original code structure and avoid auto-adding type assertions

#### Proper Type Handling for JSONB Columns

Define explicit TypeScript interfaces for JSONB columns based on their expected structure:

```typescript
// Example for game_state JSONB column
interface GameState {
  coins: number;
  energy: number;
  boosts: {
    turboActive: boolean;
    rewardedTurbo: number;
    rewardedRecharge: number;
    // ... other boost properties
  };
  autoTapActive: boolean;
  autoTapEndTime: number | null;
  // ... other game state properties
}

// Example for rewards JSONB column
interface Rewards {
  coins: number;
  spins: number;
}

// Example for social_tasks JSONB column
interface SocialTasks {
  [key: string]: {
    enabled: boolean;
    clicks: number;
    links: string[];
  };
}
```

#### Using .returns<T>() for Type Safety

Use `.returns<T>()` for Supabase queries to enforce type safety:

```typescript
// Good - Explicit type return
const { data } = await supabase
  .from("telegram_users")
  .select("game_state")
  .eq("user_id", userId)
  .returns<{ game_state: GameState }[]>();

// Good - Typed JSONB column
const { data } = await supabase
  .from("customers")
  .select("social_tasks")
  .returns<{ social_tasks: SocialTasks }[]>();
```

#### TypeScript Configuration

If type errors occur, suggest:

1. Defining proper interfaces for JSONB columns
2. Using `.returns<T>()` for explicit type safety
3. Adjusting `tsconfig.json` settings if absolutely necessary:
   - `"strict": false` (only as last resort)
   - `"skipLibCheck": true` (for library type issues)
   - `"noImplicitAny": false` (only if types are too complex)

### 3. Database Schema Management

#### Table Structure from phoenix_schema_safe_deploy.sql

Current tables (9 total):

1. `telegram_users` - Main user table with JSONB game_state
2. `customers` - Customer/brand table with JSONB social_tasks, website_tasks
3. `customer_social_links` - Social media links with JSONB rewards, task_requirements, completion_status, clicks
4. `daily_rewards` - Daily reward tracking with JSONB reward_data
5. `payment_records` - Payment history with JSONB payload
6. `auto_tap_rewards` - Auto-tap bot rewards
7. `user_referral_stats` - Referral statistics with JSONB total_rewards, claimed_rewards
8. `user_task_completions` - Task completion tracking
9. `user_referrals` - Referral relationships

#### JSONB Columns Requiring Type Definitions

- `telegram_users.game_state`: Complete game state object
- `customers.social_tasks`: Social media task configurations
- `customers.website_tasks`: Website task configurations
- `customer_social_links.rewards`: Reward amounts (coins, spins)
- `customer_social_links.task_requirements`: Task verification settings
- `customer_social_links.platform_data`: Platform-specific data
- `customer_social_links.completion_status`: Completion tracking
- `customer_social_links.clicks`: Array of user IDs who clicked
- `daily_rewards.reward_data`: Additional reward information
- `payment_records.payload`: Payment payload data
- `user_referral_stats.total_rewards`: Total rewards earned
- `user_referral_stats.claimed_rewards`: Rewards already claimed

### 4. Supabase Client Usage

#### Proper Client Initialization

```typescript
// lib/supabase.ts or app/lib/supabase.ts (choose ONE)
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/app/types/supabase";

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);
```

#### Query Examples with Proper Types

```typescript
// Reading with type safety
const { data, error } = await supabase
  .from("telegram_users")
  .select("game_state")
  .eq("user_id", userId)
  .single();

if (!error && data) {
  const gameState = data.game_state as GameState;
  // Now you have type-safe access to gameState properties
}

// Updating JSONB columns
const { error } = await supabase
  .from("telegram_users")
  .update({
    game_state: {
      ...existingGameState,
      coins: newCoinValue,
    },
  })
  .eq("user_id", userId);
```

### 5. File Organization

#### Allowed Supabase Files

- `phoenix_schema_safe_deploy.sql` - Main schema file (required)
- `lib/supabase.ts` OR `app/lib/supabase.ts` - Client initialization (choose ONE)
- `types/supabase.ts` OR `app/types/supabase.ts` - Type definitions (choose ONE)
- `app/types/supabase-realtime.d.ts` - Realtime type definitions (if needed)

#### Files to Remove

- Any `.backup` files (e.g., `types/supabase.ts.backup`)
- Duplicate supabase client files
- Duplicate type definition files
- Any scattered SQL files outside of `phoenix_schema_safe_deploy.sql`

### 6. Error Handling

```typescript
// Good - Proper error handling without type assertions
const { data, error } = await supabase
  .from("telegram_users")
  .select("*")
  .eq("user_id", userId)
  .single();

if (error) {
  console.error("Database error:", error);
  throw new Error(`Failed to fetch user: ${error.message}`);
}

// Bad - Using as any to bypass errors
const data = ((await supabase.from("telegram_users").select("*")) as any).data;
```

### 7. IDE Configuration

Update IDE auto-fix and linter settings:

- Configure ESLint to warn against `as any`
- Disable auto-suggestions for type assertions
- Enable strict type checking for Supabase queries

### 8. Deployment Safety

The `phoenix_schema_safe_deploy.sql` file uses:

- `CREATE TABLE IF NOT EXISTS` for all tables
- `CREATE INDEX IF NOT EXISTS` for all indexes
- `CREATE OR REPLACE` for functions
- Conditional constraint and policy creation
- Safe to run multiple times without errors

## Summary Checklist

- [ ] Only one schema file: `phoenix_schema_safe_deploy.sql`
- [ ] No `as any` type assertions in codebase
- [ ] Explicit TypeScript interfaces for all JSONB columns
- [ ] Use `.returns<T>()` for type-safe queries
- [ ] Only one Supabase client file (lib/supabase.ts OR app/lib/supabase.ts)
- [ ] Only one types file (types/supabase.ts OR app/types/supabase.ts)
- [ ] Remove all .backup files
- [ ] Proper error handling without type bypasses
- [ ] TypeScript strict mode enabled or proper type definitions
