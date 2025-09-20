# Earn Page Issues

## #1 Campaign Archive Functionality

- **Issue**: Completed campaigns not moving to archive with proper count updates
- **Solution**: Modified campaign completion logic to filter completed campaigns from main view and display in archive
- **Implementation**: Added `isCampaignCompleted` tracking, updated archive count calculation, enhanced archive page to show completed campaigns

## #2 Conditional Section Display

- **Issue**: Special Tasks section showing even when no Sparky tasks available
- **Solution**: Made Special Tasks and Campaigns sections conditional based on available content
- **Implementation**: Special Tasks only shows when `tasks.length > 0`, Campaigns only shows when `nonSparkyCustomers.length > 0`, added standalone archive link for completed items
