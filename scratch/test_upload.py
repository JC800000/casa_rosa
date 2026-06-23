import requests
import os

# Create a small dummy image for testing
from PIL import Image
img = Image.new('RGB', (100, 100), color='pink')
dummy_img_path = 'scratch/dummy_test_image.png'
os.makedirs('scratch', exist_ok=True)
img.save(dummy_img_path)

url = 'http://127.0.0.1:8000/api/upload-foto/'

try:
    with open(dummy_img_path, 'rb') as f:
        files = {'foto': (os.path.basename(dummy_img_path), f, 'image/png')}
        response = requests.post(url, files=files)
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
except Exception as e:
    print("Error connecting to upload endpoint:", e)

# Clean up
if os.path.exists(dummy_img_path):
    os.remove(dummy_img_path)
