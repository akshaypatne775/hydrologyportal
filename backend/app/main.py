from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Map tiles, ortho, DEM, videos, etc. (served under /tiles for the React app).
LOCAL_DATA_PATH = r"D:/Codings/Hydrology Data Portal React Version/Project_Data"

Path(LOCAL_DATA_PATH).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Hydrology & Mapping Portal API",
    description="Backend services for hydrology data and mapping.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/tiles",
    StaticFiles(directory=LOCAL_DATA_PATH),
    name="local-tiles",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
