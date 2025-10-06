# Bug Tracking & Database Safety Rules

## 🐛 Bug Tracking Reference
**CRITICAL**: Always reference the `.cursor/BUGS.md` file before making any changes. This file contains:
- Active bugs and their status
- Resolved bugs with detailed solutions
- Common bug patterns and prevention measures
- Critical reminders about database safety

**MANDATORY ACTIONS**:
1. **Before implementing any new feature**: Check `.cursor/BUGS.md` for similar issues that were previously encountered
2. **When encountering a bug**: Add it to `.cursor/BUGS.md` using the provided template
3. **When resolving a bug**: Update `.cursor/BUGS.md` with detailed resolution information
4. **Before making database changes**: Review the database safety section in `.cursor/BUGS.md`

## 🚨 Database Safety Rules (ZERO TOLERANCE FOR DATA LOSS)

### ABSOLUTELY FORBIDDEN COMMANDS (NEVER RUN WITHOUT EXPLICIT WRITTEN PERMISSION):
- `npx supabase db reset --linked` (DELETES ALL LIVE DATA)
- `npx supabase db reset` (DELETES ALL LOCAL DATA)
- `npx supabase db reset --linked --no-seed` (DELETES LIVE DATA)
- `npx supabase db reset --no-seed` (DELETES LOCAL DATA)
- ANY command with `--linked` flag that modifies data
- `DROP TABLE`, `DELETE`, `TRUNCATE` commands
- Any migration that deletes data
- `psql` commands that modify data
- Any command that could affect production data

### SAFE COMMANDS (OK to run):
- `npx supabase db pull --linked` (read-only)
- `npx supabase status` (read-only)
- `npx supabase migration list` (read-only)
- `npx supabase projects list` (read-only)
- `npx supabase db push --linked` (ONLY for NEW migrations that ADD data)

### MANDATORY DATABASE OPERATION PROTOCOL:
1. **NEVER** run ANY database modification command without explicit user permission
2. **ALWAYS** ask "Is it safe to run [command]?" before executing
3. **ALWAYS** work on LOCAL database first (`--local` flag)
4. **NEVER** run `--linked` commands without explicit user approval
5. **ALWAYS** backup before ANY destructive operations
6. **ALWAYS** test migrations locally before pushing to live
7. **ALWAYS** verify table structure before inserting data
8. **NEVER** assume it's safe to modify live data

## 📁 File Modification Priority
Before creating new files for any purpose (configuration, database access, testing scripts, SQL files, components, styles, or assets), always search for and prioritize modifying existing relevant files with any extension (.ts, .tsx, .js, .jsx, .sql, .json, .yml, .yaml, .env, .test.ts, .test.tsx, .spec.ts, .spec.tsx, .css, .scss, .sass, .png, .jpg, .jpeg, .svg, .ttf, .otf, .gradle, .xml, .plist, .podspec, .pod, .md, .sh, etc.) in the project to avoid duplication and ensure changes align with the existing setup.

## 🔍 Project Structure Awareness
This is a Next.js project with:
- **Frontend**: React/TypeScript components in `app/` directory
- **Backend**: API routes in `app/api/`
- **Database**: Supabase integration with local development setup
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Context for game state
- **Authentication**: Telegram WebApp integration

## 🎯 Development Guidelines
1. **Always check `.cursor/BUGS.md`** before starting any task
2. **Follow existing patterns** in the codebase
3. **Test locally first** before any deployment
4. **Update bug tracker** when encountering or resolving issues
5. **Maintain database safety** as the highest priority
6. **Use existing files** when possible instead of creating new ones

## 📝 Code Quality Standards
- Use TypeScript for all new files
- Follow existing naming conventions
- Add proper error handling
- Include relevant comments for complex logic
- Test all changes thoroughly
- Update documentation when needed

## 🚫 What NOT to Do
- Never run destructive database commands without explicit permission
- Never ignore the bug tracking file
- Never create duplicate files when existing ones can be modified
- Never deploy without local testing
- Never assume database operations are safe

## ✅ What TO Do
- Always reference `.cursor/BUGS.md` before making changes
- Always ask for permission before database operations
- Always test changes locally first
- Always update bug tracker when resolving issues
- Always follow existing project patterns
- Always prioritize data safety over speed

Remember: The user's data is PRECIOUS. It's better to be overly cautious than to lose data.
