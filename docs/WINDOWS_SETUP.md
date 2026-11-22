# GlobalDub AI — Windows Setup & Operation Guide

This document provides step-by-step instructions for running **GlobalDub AI** on Windows 10/11 (PowerShell).

---

## 1. Prerequisites

Verify installed prerequisites:

- **Python**: 3.11+ (Python 3.13.14 verified)
- **Node.js**: 18+ (Node v24.17.0 verified)
- **npm**: 9+ (npm 11.13.0 verified)
- **FFmpeg 7.1+**: Provided via bundled Python `imageio-ffmpeg` static binary engine, or system PATH.

To check versions in PowerShell:
```powershell
python --version
node --version
npm --version
```

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Open `.env` and set your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> [!NOTE]
> If `GEMINI_API_KEY` is omitted, the application runs seamlessly using built-in testing engines and the Edge Neural Speech synthesis adapter for 100+ languages without third-party fees.

---

## 3. Python Virtual Environment & Dependencies

From the project root:
```powershell
# Create virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -r backend/requirements.txt
```

---

## 4. Frontend Setup

From the project root:
```powershell
cd frontend
npm install
npm run build
cd ..
```

---

## 5. Starting the Platform

Open two PowerShell windows:

### Terminal 1: Backend Server (FastAPI + Background Workers)
```powershell
python backend/run.py
```
- API starts at: `http://127.0.0.1:8000`
- Swagger Interactive Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Terminal 2: Frontend Web App (Next.js)
```powershell
cd frontend
npm run dev
```
- Access the web interface at: `http://localhost:3000`

---

## 6. Running the Automated Test Suite

Run all unit, integration, and synthetic media tests:
```powershell
python -m pytest backend/tests -v
```

All 14 tests will execute, including:
- Audio extraction and stream probing
- Language registry & RTL validation
- Subtitle generator (SRT/WebVTT Unicode & RTL)
- Audio synchronizer & timeline assembly
- Upload limits and path traversal defense
- Full end-to-end synthetic video dubbing pipeline
