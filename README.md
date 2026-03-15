---
title: Traffic Sign Detector
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

FastAPI backend for traffic sign detection (YOLOv8 + ResNet-18).

Required model files (already in repo via Git LFS):
- `backend/best.pt`
- `backend/best_traffic_sign_model.pt`

Environment variables:
- `ALLOWED_ORIGINS`: comma-separated list of allowed frontend origins.
  Example: `https://your-frontend.onrender.com`
