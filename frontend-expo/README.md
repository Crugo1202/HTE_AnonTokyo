# Teacher Performance Dashboard - Frontend

React Native (Expo) application for the Teacher Performance Dashboard.

## Prerequisites (macOS)

To avoid **EMFILE: too many open files** when running the dev server:

1. **Preferred:** Install [Watchman](https://facebook.github.io/watchman/). Metro will use it for file watching:
   ```bash
   brew install watchman
   ```

2. **If EMFILE persists:** Raise the system file limit once (then run `npm run web` from any terminal):
   ```bash
   sudo bash scripts/set-maxfiles.sh
   ```
   You may need to run this again after a reboot.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Download Inter font files and place them in `assets/fonts/`:
   - Inter-Regular.ttf
   - Inter-Medium.ttf
   - Inter-SemiBold.ttf
   - Inter-Bold.ttf

   You can download Inter from [Google Fonts](https://fonts.google.com/specimen/Inter) or [rsms.me/inter](https://rsms.me/inter/).

3. Create placeholder assets in `assets/`:
   - icon.png (1024x1024)
   - splash.png (1284x2778)
   - adaptive-icon.png (1024x1024)
   - favicon.png (48x48)

4. Configure API URL (optional):
   Create a `.env` file in this directory (`frontend-expo/`):
   ```
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```

## Running

- Web: `npm run web`
- iOS: `npm run ios`
- Android: `npm run android`

## Project Structure

- `app/` - Expo Router screens and layouts
- `components/` - Reusable React components
- `services/` - API client and services
- `types/` - TypeScript type definitions
- `utils/` - Constants and utilities
