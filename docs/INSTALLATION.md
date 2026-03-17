# Installation Guide

Complete setup instructions for VoiceTrace.

## Prerequisites

Before installing VoiceTrace, ensure you have:

- **Python 3.12+** — Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — Download from [nodejs.org](https://nodejs.org/)
- **FFmpeg** — Required for video/audio processing
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **Git** — For cloning the repository
- **4GB+ RAM** — Recommended for smooth operation

## Step 1: Clone Repository

```bash
git clone https://github.com/Crugo1202/HTE_AnonTokyo.git
cd HTE_AnonTokyo
```

## Step 2: Set Up Backend

### 2.1 Create Python Virtual Environment

```bash
# macOS / Linux
python3.12 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 2.2 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.3 Create Environment File

```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:

```bash
# ElevenLabs (required for TTS voice features)
ELEVENLABS_API_KEY=sk_c39d862c5f77442a9ee07d3af040e553f63e21e05f3090c1

# MiniMax (required for AI feedback & video generation)
MINIMAX_API_KEY=sk-cp-a31fmT29mWKiNTJhZpv3dZi3JzPw8VVWDI1lyChgRO-...

# Google Gemini (optional, but recommended for body language analysis)
# GEMINI_API_KEY=your_gemini_api_key

# AWS (optional, for large file S3 uploads)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1
```

## Step 3: Set Up Frontend

### 3.1 Navigate to Frontend Directory

```bash
cd frontend
```

### 3.2 Install Node Dependencies

```bash
npm install
```

### 3.3 Create Frontend Environment (Optional)

The frontend reads the backend proxy from Vite config by default. If you need custom settings:

```bash
# frontend/.env
VITE_API_BASE_URL=/api
```

## Step 4: Run Locally

Open **two terminal windows** or use a terminal multiplexer.

### Terminal 1: Start Backend (Port 8000)

```bash
# From project root
venv/bin/uvicorn app.main:app --reload --port 8000
```

You'll see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2: Start Frontend (Port 5173)

```bash
# From frontend directory
npm run dev
```

You'll see:
```
Local:   http://localhost:5173/
```

### 3.4 Open Your Browser

Visit [http://localhost:5173](http://localhost:5173)

## Step 5: Verify Installation

### Check Backend API

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to see the interactive API documentation.

### Test with Sample File

1. Dashboard tab → Click "Upload"
2. Select a sample video file
3. Watch the analysis pipeline:
   - Transcription
   - Body language analysis
   - Teaching evaluation
   - AI feedback generation

### Quick TTS Test

```bash
# From project root
python tests/test_tts.py           # Test direct ElevenLabs
python tests/test_tts.py --backend # Test backend proxy
```

Both should return `SUCCESS` with byte sizes.

## Docker Installation

### Build Image

```bash
docker build -t voicetrace:latest .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e ELEVENLABS_API_KEY=sk_... \
  -e MINIMAX_API_KEY=sk-... \
  --name voicetrace \
  voicetrace:latest
```

Then visit [http://localhost:8000](http://localhost:8000)

## Troubleshooting

### Port Already in Use

If port 8000 or 5173 is already in use:

**macOS/Linux:**
```bash
# Find process using port 8000
lsof -i :8000
# Kill it
kill -9 <PID>
```

**Windows:**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Python Module Not Found

```bash
# Ensure venv is activated and requirements are installed
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### FFmpeg Not Found

```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not, install:
brew install ffmpeg          # macOS
sudo apt-get install ffmpeg  # Ubuntu/Debian
choco install ffmpeg         # Windows (requires Chocolatey)
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Key Permissions Error

If you see: `"missing_permissions": "text_to_speech"`

1. Go to [https://elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
2. Edit your API key
3. Enable "Text to Speech" permission
4. Restart the backend

## Next Steps

1. Read the [README.md](README.md) for feature overview
2. Check [CONTRIBUTING.md](CONTRIBUTING.md) if you want to contribute
3. See [docs/](docs/) folder for detailed documentation
4. Review [API documentation](http://localhost:8000/docs) when backend is running

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/Crugo1202/HTE_AnonTokyo/issues)
- **Docs**: Check `/docs` folder
- **API Reference**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

Happy analyzing! 🎓
