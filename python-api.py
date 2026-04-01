from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io
import base64
from gradio_client import Client, file as gradio_file
import tempfile

app = Flask(__name__)
CORS(app)
client = Client("vpdiga-24/plant-idfire")

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/process', methods=['POST'])
def process_image():
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, WEBP'}), 400
        
        # Get instruction parameter
        instruction = request.form.get('instruction', 'identify').lower()
        
        if instruction not in ['identify', 'diagnose']:
            return jsonify({'error': 'Invalid instruction. Must be "identify" or "diagnose"'}), 400
        
        # Read image file
        image_data = file.read()
        
        if len(image_data) > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds 10MB limit'}), 400
        
        # Process image based on instruction
        if instruction == 'identify':
            result = process_identify(image_data)
        else:  # diagnose
            result = process_diagnose(image_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f'Error processing image: {str(e)}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def process_identify(image_data):
    """
    Process image for plant identification
    TODO: Replace with actual MobileNetV2 model inference
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_data))
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(image_data)
            temp_path = tmp.name

        # Call Hugging Face Gradio model
        result = client.predict(
            gradio_file(temp_path),
            api_name="/predict"
        )

        # Cleanup temp file
        os.remove(temp_path)

        return {
            "classes": [result[0]["label"]],
            # "classes": ["lactuca_virosa"],
            "confidences": [0.61120593547]
        }

    except Exception as e:
        raise Exception(f'Identification error: {str(e)}')

def process_diagnose(image_data):
    """
    Process image for disease diagnosis
    TODO: Replace with actual disease detection model inference
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_data))
        
        # TODO: Add your disease detection model inference here
        # Example:
        # model = load_model('disease_detection_model.h5')
        # prediction = model.predict(preprocessed_image)
        # disease = get_disease_from_prediction(prediction)
        # recommendations = get_recommendations(disease)
        
        # Mock response for now
        return {
            "is_healthy": False,
            "disease": "early blight",
            "disease_confidence": 0.80
        }
    except Exception as e:
        raise Exception(f'Diagnosis error: {str(e)}')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'Python Plant Care API'}), 200

if __name__ == '__main__':
    print('🌱 Starting Python Plant Care API...')
    print('📡 API will be available at http://localhost:8000')
    print('🔗 Endpoints:')
    print('   POST /api/process - Process image (identify/diagnose)')
    print('   GET  /health - Health check')
    app.run(host='0.0.0.0', port=8000, debug=True)




