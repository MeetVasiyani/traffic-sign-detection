"""
FastAPI backend for Traffic Sign Detection System.

Endpoints:
  POST /detect              — YOLOv8 detection (image/video)
  POST /predict-missing-sign — ResNet-18 classification

Place these model files in the same directory as this file:
  - best.pt                       (YOLOv8 weights)
  - best_traffic_sign_model.pt    (ResNet-18 weights)

Run:
  python main.py
"""

import io
import uuid
import os
import asyncio
import base64
import json
import tempfile
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from ultralytics import YOLO

# ── Setup ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Traffic Sign Detection API")

# CORS: configure via env for production
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:8000",
).split(",")
allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Serve result images as static files at /results/<file>
app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")

# React frontend is mounted at the end of the file (after all API routes)
FRONTEND_DIR = BASE_DIR.parent / "traffic-sign-frontend" / "dist"


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Traffic Sign Detection API is running",
    }

# ── Load Models ──────────────────────────────────────────────────────────────

# YOLOv8
yolo_model = YOLO(str(BASE_DIR / "best.pt"))

# ResNet-18
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CLASS_NAMES = [
    "gap-in-median",
    "left-hand-curve",
    "right-hand-curve",
    "side-road-left",
]

resnet_model = models.resnet18(weights=None)
resnet_model.fc = nn.Linear(resnet_model.fc.in_features, len(CLASS_NAMES))
resnet_model.load_state_dict(
    torch.load(str(BASE_DIR / "best_traffic_sign_model.pt"), map_location=device)
)
resnet_model = resnet_model.to(device)
resnet_model.eval()

resnet_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
])

# ── Blocking helpers run in threadpool ───────────────────────────────────────

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".wmv"}


def _detect_image(contents: bytes, confidence: float, base_url: str):
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    results = yolo_model.predict(image_np, conf=confidence)

    annotated = results[0].plot()
    filename = f"{uuid.uuid4().hex}.jpg"
    save_path = RESULTS_DIR / filename
    Image.fromarray(annotated).save(str(save_path))

    boxes = results[0].boxes.cls.cpu().numpy()
    detections = [CLASS_NAMES[int(i)] for i in boxes]

    base_url = base_url.rstrip("/")
    return {
        "result_image_url": f"{base_url}/results/{filename}",
        "detections": detections,
    }


def _detect_video(contents: bytes, ext: str, confidence: float, base_url: str):
    # Write uploaded bytes to a temp file so OpenCV can read it
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext or ".mp4")
    tmp.write(contents)
    tmp.close()

    cap = cv2.VideoCapture(tmp.name)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    duration_sec = total_frames / fps if total_frames > 0 and fps > 0 else 0

    print(f"[VIDEO] total_frames={total_frames}, fps={fps}, duration={duration_sec:.1f}s")

    # Sample at most MAX_SAMPLES frames spread evenly across the video
    MAX_SAMPLES = 10

    if total_frames > 0:
        # Pick evenly-spaced frame indices
        step = max(1, total_frames // MAX_SAMPLES)
        sample_indices = set(range(0, total_frames, step))
    else:
        # Unknown frame count — sample every Nth frame, stop after MAX_SAMPLES detections
        step = max(int(fps * 2), 10)  # ~1 frame every 2 seconds
        sample_indices = None

    all_detections = set()
    annotated_frames = []
    frame_count = 0
    samples_done = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        should_process = (
            (sample_indices is not None and frame_count in sample_indices) or
            (sample_indices is None and frame_count % step == 0)
        )

        if should_process:
            results = yolo_model.predict(frame, conf=confidence)
            annotated = results[0].plot()
            annotated_frames.append(annotated)
            boxes = results[0].boxes.cls.cpu().numpy()
            for i in boxes:
                all_detections.add(CLASS_NAMES[int(i)])
            samples_done += 1
            print(f"[VIDEO] Processed frame {frame_count}/{total_frames or '?'} ({samples_done}/{MAX_SAMPLES})")
            if samples_done >= MAX_SAMPLES:
                break

        frame_count += 1

    cap.release()
    os.unlink(tmp.name)

    # Save all annotated sample frames as images
    base_url = base_url.rstrip("/")
    result_images = []
    for idx, img in enumerate(annotated_frames):
        fname = f"{uuid.uuid4().hex}.jpg"
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        Image.fromarray(img_rgb).save(str(RESULTS_DIR / fname))
        result_images.append(f"{base_url}/results/{fname}")

    print(f"[VIDEO] Done. {samples_done} frames processed, {len(all_detections)} unique signs found.")

    return {
        "result_image_url": result_images[0] if result_images else None,
        "result_images": result_images,
        "detections": list(all_detections),
        "frames_processed": samples_done,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/detect")
async def detect(
    request: Request,
    file: UploadFile = File(...),
    confidence: float = Form(0.25),
):
    """Run YOLOv8 detection on an uploaded image or video."""
    contents = await file.read()
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    base_url = str(request.base_url)

    if ext in IMAGE_EXTENSIONS or (file.content_type and file.content_type.startswith("image/")):
        return await asyncio.to_thread(_detect_image, contents, confidence, base_url)

    if ext in VIDEO_EXTENSIONS or (file.content_type and file.content_type.startswith("video/")):
        return await asyncio.to_thread(_detect_video, contents, ext, confidence, base_url)

    return {"error": "Unsupported file type. Upload an image or video."}


# ── Video uploads stored temporarily for streaming ───────────────────────────
_video_store = {}


@app.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.25),
):
    """Upload a video and get back a stream ID to use with /detect-video-stream."""
    contents = await file.read()
    ext = Path(file.filename).suffix.lower() if file.filename else ".mp4"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp.write(contents)
    tmp.close()

    stream_id = uuid.uuid4().hex
    _video_store[stream_id] = {"path": tmp.name, "confidence": confidence}

    return {"stream_id": stream_id}


@app.get("/detect-video-stream/{stream_id}")
async def detect_video_stream(stream_id: str, request: Request):
    """SSE endpoint: streams annotated frames as base64 JPEG, one per event."""
    entry = _video_store.pop(stream_id, None)
    if not entry:
        return {"error": "Invalid or expired stream ID"}

    video_path = entry["path"]
    confidence = entry["confidence"]

    def generate():
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        frame_skip = max(1, int(fps // 2))  # ~2 detections per second of video

        all_detections = set()
        frame_count = 0
        processed = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_skip == 0:
                results = yolo_model.predict(frame, conf=confidence)
                annotated = results[0].plot()

                # Collect detections
                boxes = results[0].boxes.cls.cpu().numpy()
                for i in boxes:
                    all_detections.add(CLASS_NAMES[int(i)])

                # Encode annotated frame as JPEG base64
                annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(annotated_rgb)
                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=70)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")

                processed += 1
                progress = round(frame_count / total_frames * 100) if total_frames > 0 else 0

                payload = json.dumps({
                    "frame": b64,
                    "frame_number": frame_count,
                    "total_frames": total_frames,
                    "progress": progress,
                    "processed": processed,
                    "detections": list(all_detections),
                })
                yield f"data: {payload}\n\n"

            frame_count += 1

        cap.release()
        os.unlink(video_path)

        # Final event
        done_payload = json.dumps({
            "done": True,
            "detections": list(all_detections),
            "frames_processed": processed,
        })
        yield f"data: {done_payload}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/predict-missing-sign")
async def predict_missing_sign(file: UploadFile = File(...)):
    """Run ResNet-18 classification on an uploaded road image."""
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    tensor = resnet_transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = resnet_model(tensor)
        probabilities = torch.softmax(outputs, dim=1)
        conf, predicted = torch.max(probabilities, 1)

    return {
        "prediction": CLASS_NAMES[predicted.item()],
        "confidence": round(conf.item(), 4),
    }


# ── Serve React frontend (must be AFTER all API routes) ─────────────────────

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="frontend-assets")

    @app.get("/{path:path}")
    async def serve_frontend(path: str = ""):
        """Serve React SPA — all non-API routes fall through to index.html."""
        file_path = FRONTEND_DIR / path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


