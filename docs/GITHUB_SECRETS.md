# GitHub Secrets for HTE AnonTokyo

Configure these secrets in your repository: **Settings → Secrets and variables → Actions**.

## Required for deployment (AWS already configured)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key for deploy (ECR push, Lambda update) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key for deploy |

## Required for app features

| Secret | Description |
|--------|-------------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key — used for **Speech-to-Text** (transcription) via Scribe API |
| `GEMINI_API_KEY` | Google Gemini API key — used for **body language analysis** and **rubric evaluation**. When not set, **fallback**: uses pre-analyzed files from `body_language_analysis/` |
| `MINIMAX_API_KEY` | Minimax API key — used for **AI teacher feedback** (Anthropic-compatible endpoint) |

## Optional

| Secret | Description |
|--------|-------------|
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID — enables cache invalidation after deploy |

---

## How secrets are used

- **Deploy workflow** (`deploy.yml`): `AWS_*` for ECR/Lambda; `ELEVENLABS_*`, `GEMINI_*`, `MINIMAX_*` are written to Lambda environment variables.
- **Lambda runtime**: Reads `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `MINIMAX_API_KEY` from environment.

## Getting API keys

- **ElevenLabs**: [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys
- **Gemini**: [Google AI Studio](https://aistudio.google.com/) → Get API key
- **Minimax**: [platform.minimax.io](https://platform.minimax.io) → API keys
