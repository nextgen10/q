import sys
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Adjust sys.path to ensure we can import from project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

from studio.backend.routers import recorder, generator, runner, workflow, settings, ai, locators, feedback, prompts, test_design, healer, roi, data



app = FastAPI(title="Playwright POM Studio")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # POM standalone frontend (Vite)
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # Qualaris Next.js frontend
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(recorder.router)
app.include_router(generator.router)
app.include_router(runner.router)
app.include_router(workflow.router)
app.include_router(settings.router)
app.include_router(ai.router)
app.include_router(locators.router)
app.include_router(feedback.router)
app.include_router(prompts.router)
app.include_router(test_design.router)
app.include_router(healer.router)
app.include_router(roi.router)
app.include_router(data.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Studio Backend is running (Modular)"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
