# Optional Python backend: saves applications and CVs on your computer.
# Setup: pip install flask flask-cors      Run: python app.py
# Then set ENDPOINT in script.js to "http://127.0.0.1:5000/apply"
import json, os, time
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024
os.makedirs("uploads", exist_ok=True)
REQUIRED = ["full-name", "email", "phone-number", "position", "experience", "start-date", "skills", "message"]
OPTIONAL = ["work-mode", "salary", "linkedin", "portfolio"]

@app.post("/apply")
def apply():
    data, cv = request.form, request.files.get("cv")
    if not cv or any(not data.get(k) for k in REQUIRED):
        return jsonify(error="Missing fields"), 400
    ext = os.path.splitext(cv.filename)[1].lower()
    if ext not in {".pdf", ".doc", ".docx"}:
        return jsonify(error="Invalid file type"), 400
    ref = "TW-" + str(int(time.time()))
    cv.save(os.path.join("uploads", ref + ext))
    record = {k: data.get(k, "") for k in REQUIRED + OPTIONAL} | {"ref": ref}
    with open("applications.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    return jsonify(ref=ref)

if __name__ == "__main__":
    app.run(port=5000)