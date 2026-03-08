# Qualaris — Unified Platform

> Enterprise-grade evaluation suite for RAG Pipelines, AI Agents, Ground Truth datasets, and Playwright automation.

## Architecture

```
qualaris_new/
├── src/                    # Next.js frontend (TypeScript, MUI, UBS design)
│   ├── app/
│   │   ├── agent-eval/     # Agent Eval module
│   │   ├── rag-eval/       # RAG Eval module
│   │   ├── playwright-pom/ # Playwright Compass module
│   │   ├── ground-truth/   # Ground Truth Generator module
│   │   ├── docs/           # Platform documentation
│   │   └── login/          # Authentication
│   ├── components/         # Shared UI — UnifiedNavBar, UbsLogoFull, AuthGuard
│   ├── theme/              # UBS design tokens + MUI theme factory
│   └── contexts/           # Auth + Theme providers
│
├── backend/                # FastAPI backend (Python)
│   ├── main.py             # RAG Eval API + mounts all routers
│   ├── agent_router.py     # Agent Eval + Auth endpoints
│   ├── auth.py             # API key authentication
│   ├── studio/             # Playwright Compass backend
│   └── requirements.txt
│
├── start.sh                # Start all services (backend + frontend)
├── stop.sh                 # Stop all services
└── .env.local              # Frontend environment variables
```

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **npm** ≥ 9

## Quick Start

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Set up backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # then fill in your API keys
cd ..
```

### 3. Start everything
```bash
chmod +x start.sh stop.sh
./start.sh
```

| Service | URL |
|---------|-----|
| Qualaris UI | http://localhost:3000 |
| Swagger API docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### Stop all services
```bash
./stop.sh
```

---

## Environment Variables

### Frontend — `.env.local`
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `PLAYWRIGHT_POM_API_BASE` | `http://localhost:8000` | Playwright Compass backend URL |

### Backend — `backend/.env`
Copy `backend/.env.example` and fill in:
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI key for LLM evaluation |
| `AZURE_OPENAI_*` | Azure OpenAI config (if using Azure) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

---

## Modules

| Module | Frontend Route | Backend Prefix | Description |
|--------|---------------|---------------|-------------|
| **RAG Eval** | `/rag-eval` | `/evaluate`, `/evaluations` | Benchmarks RAG pipelines |
| **Agent Eval** | `/agent-eval` | `/agent-eval/...` | Evaluates autonomous agents |
| **Ground Truth Generator** | `/ground-truth` | — (client-only) | Dataset engineering studio |
| **Playwright Compass** | `/playwright-pom` | `/api/playwright-pom/...` | Browser automation |
| **Documentation** | `/docs` | — | Platform guide |

---

## Development

### Frontend only
```bash
npm run dev
```

### Backend only
```bash
cd backend && python3 -m uvicorn main:app --reload --port 8000
```

### Build for production
```bash
npm run build
npm start
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, MUI v7, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy, SQLite, Uvicorn |
| LLM Evaluation | OpenAI gpt-4o / Azure OpenAI |
| Auth | API key-based (X-API-Key header) |
| Design | UBS-inspired design system |
