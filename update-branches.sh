#!/bin/bash

# Script to update staging and prod branches from dev
# Assumes:
# - You are on the dev branch with no uncommitted changes.
# - Remote is named 'origin'.
# - Branches: dev, staging, prod.
# Run this script from your repo root: ./update-branches.sh

# Function to prompt for confirmation
confirm() {
    read -p "$1 (y/n): " choice
    case "$choice" in
        y|Y ) return 0;;
        * ) echo "Aborted."; exit 1;;
    esac
}

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "Error: Working directory is not clean. Commit or stash changes first."
    exit 1
fi

# Ensure we're on dev
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "dev" ]; then
    echo "Error: Not on dev branch. Checkout dev first."
    exit 1
fi

echo "Starting update process..."
echo "Current dev commit: $(git rev-parse --short HEAD)"
echo ""

# Step 1: Update staging from dev
confirm "Proceed to update staging?"
git checkout staging
git pull origin staging
confirm "Merge dev into staging?"
git merge dev
if [ $? -ne 0 ]; then
    echo "Merge conflict detected. Resolve manually, then rerun or continue manually."
    exit 1
fi
confirm "Push updated staging to origin?"
git push origin staging

# Step 2: Update prod from staging
confirm "Proceed to update prod?"
git checkout prod
git pull origin prod
confirm "Merge staging into prod?"
git merge staging
if [ $? -ne 0 ]; then
    echo "Merge conflict detected. Resolve manually, then rerun or continue manually."
    exit 1
fi
confirm "Push updated prod to origin?"
git push origin prod

# Return to dev
git checkout dev

echo ""
echo "Update complete! Verify on remote."
echo "All branches should now be synchronized."
