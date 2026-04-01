# Python API Setup

This directory contains the Python Flask API for processing plant images.

## Setup Instructions

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Python API server:
   ```bash
   python python-api.py
   ```

   The API will start on `http://localhost:8000`

## API Endpoints

### POST /api/process
Processes an image for plant identification or disease diagnosis.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `image`: Image file (JPG, PNG, JPEG, WEBP)
  - `instruction`: Either `"identify"` or `"diagnose"`

**Response:**
```json
{
  "success": true,
  "plant_name": "Tomato Plant",
  "confidence": 0.92,
  "is_healthy": false,
  "disease": "Early Blight",
  "disease_confidence": 0.92,
  "recommendations": [...]
}
```

### GET /health
Health check endpoint.

## Integration

The Express server (`server.js`) and Vercel serverless functions (`api/*.js`) forward image processing requests to this Python API.

Set the `PYTHON_API_URL` environment variable to change the Python API location (default: `http://localhost:8000`).







