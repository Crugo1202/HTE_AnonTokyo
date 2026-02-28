#!/usr/bin/env bash
# Raise macOS system file descriptor limit so Metro's watcher doesn't hit EMFILE.
# Run once (with sudo): sudo ./scripts/set-maxfiles.sh
# After reboot you may need to run again unless you install a LaunchDaemon.
set -e
echo "Setting maxfiles limit to 65536 (soft) 200000 (hard)..."
launchctl limit maxfiles 65536 200000
echo "Done. You can now run: npm run web"
