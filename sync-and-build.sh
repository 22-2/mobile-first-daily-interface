#!sh

# Exit on error
set -e

# Get the directory of this script
SCRIPT_DIR="E:/Desktop/coding/my-projects-02/obsidian-magical-editor"
TARGET_DIR="E:/Desktop/coding/fork/mobile-first-daily-interface"

echo "Building obsidian-magical-editor..."
cd "$SCRIPT_DIR"
pnpm build

echo "Updating and building mobile-first-daily-interface..."
cd "$TARGET_DIR"
# Use --force to ensure the local package is re-installed even if version hasn't changed
pnpm add "$SCRIPT_DIR"
pnpm fastbuild

echo "All tasks completed successfully!"
