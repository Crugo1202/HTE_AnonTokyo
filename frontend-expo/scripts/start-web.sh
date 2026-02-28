#!/usr/bin/env bash
# Raise open-files limit so Metro's file watcher doesn't hit EMFILE on macOS.
# exec replaces this shell with npx, so the Expo process inherits the limit.
ulimit -n 65536 2>/dev/null || true
exec npx expo start --web "$@"
