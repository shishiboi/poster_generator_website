# main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
import uuid
import os

from .poster_generation import generate_poster_from_prompt
from .poster_generation import enhance_prompt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Support both
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptInput(BaseModel):
    prompt: str

@app.post("/generate_poster")
def generate_poster(prompt_input: PromptInput):
    try:
        filename = f"{uuid.uuid4()}.png"
        output_dir = "posters"
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, filename)

        generate_poster_from_prompt(prompt_input.prompt, output_path)

        return FileResponse(output_path, media_type="image/png", filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/enhance_prompt")
def enhance(prompt_input: PromptInput):
    try:
        enhanced = enhance_prompt(prompt_input.prompt)
        return {"enhanced_prompt": enhanced}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

