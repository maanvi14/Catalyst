import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


def configure_cors(app: FastAPI) -> None:
    origins = []
    origin_regexes = []
    
    for origin in settings.cors_origin_list:
        if "*" in origin:
            # Convert glob wildcard (e.g. *.vercel.app) to regex
            pattern = re.escape(origin).replace(r"\*", ".*")
            origin_regexes.append(f"^{pattern}$")
        else:
            origins.append(origin)
            
    allow_origin_regex = "|".join(origin_regexes) if origin_regexes else None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

