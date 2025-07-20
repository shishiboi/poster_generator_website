# main_app_v1/poster_generation.py
import base64
from openai import OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set in the environment.")

# Initialize OpenAI client with explicit parameters
try:
    client = OpenAI(
        api_key=api_key,
        timeout=60.0,
        max_retries=3
    )
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    # Fallback initialization
    client = OpenAI(api_key=api_key)

def enhance_prompt(prompt: str) -> str:
    """Enhance a user prompt into a detailed, structured layout prompt for poster generation."""
    
    system_prompt = """
    You are a graphic designer helping generate prompts for a poster generation AI (gpt-image-1). 
    All instructions must be interpreted literally by the image model. Avoid creative liberties.
    When a user gives a short or vague prompt, expand it into a full 2:3 vertically oriented poster description.
    Always include:
    - A clear description of the background.
    - Visual style and atmosphere.
    - Layout structure with sections like Header, Mid-Section, Lower Section, and Footer.

    - Include a solid white box (200x200px, RGB #FFFFFF) at the lower section as a placeholder for the QR code. This box must appear completely empty and must not contain any QR pattern, QR label, or visual suggestion that a QR code will be added. Do not call it a QR code — it is just a white square used for layout purposes. It should be horizontally aligned with the date and time text in the same lower section layout row.

    - Include a translucent rectangular box (600x200px, RGBA(255, 255, 255, 0.3)) in the footer section of the poster. This rectangular box is completely empty and should span horizontally, clearly indicating the space for 4 to 6 logos to be inserted later. No logos should be generated inside this box. The box should be visually distinct but translucent, so the background still shows through while keeping the logo area clearly defined.

    - Ensure that the translucent rectangular box in the footer does not overlap with the date/time text or any other sections of the poster. Maintain a clear separation between the footer and the text sections to ensure a clean, readable layout.
    - Ensure all text is readable and well-aligned.
    - Instructions must be clear, print-friendly, and usable for image generation.
    Avoid making up new event names or random sponsors. Stick to the theme given.

    If the user prompt already contains detailed structure (e.g., layout, pixel sizes, font style), do not overwrite it.
    """.strip()

    chat = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User prompt: {prompt}"}
        ]
    )
    return chat.choices[0].message.content

def generate_poster_from_prompt(prompt: str, output_path: str = "poster.png") -> str:
    original_prompt = prompt.strip()
    print("Prompt received for image generation:\n", original_prompt)

    # Prevent QR code hallucination
    prompt = prompt.replace("QR code", "white box").replace("QR codes", "white boxes")

    result = client.images.generate(
        model="gpt-image-1",
        size="1024x1792",
        n=1,
        prompt=prompt
    )

    image_base64 = result.data[0].b64_json
    if not image_base64:
        raise ValueError("No image data returned from OpenAI API.")
    image_bytes = base64.b64decode(image_base64)

    with open(output_path, "wb") as f:
        f.write(image_bytes)

    return output_path
