"""
Audio Transcription Report Generator
=====================================
This script fetches audio files from the audiodb table, extracts the first 30 seconds,
transcribes them using GPU-accelerated Whisper, and generates a comprehensive report.

Languages supported: Hindi, English, Marathi (based on subject configuration)
"""

import os
import sys
import json
import torch
import whisper
import requests
import tempfile
import mysql.connector
from datetime import datetime
from pydub import AudioSegment
from typing import Optional, Dict, List, Tuple
import io
import warnings
warnings.filterwarnings("ignore")

# Database configuration (matching .env file)
DB_CONFIG = {
    'host': '13.204.48.33',
    'port': 3306,
    'user': 'root',
    'password': 'tanuj1221',
    'database': 'dec25',
    'charset': 'utf8mb4'
}

# Audio processing configuration
AUDIO_DURATION_SECONDS = 30
SAMPLE_RATE = 16000  # Whisper expects 16kHz audio

# Language mapping for subjects (you may need to update these based on your subject IDs)
# This is a default mapping - adjust based on actual subject configuration
LANGUAGE_MAP = {
    # These will be auto-detected or can be manually specified
    'default': 'auto'  # Let Whisper auto-detect the language
}

def check_gpu_availability():
    """Check if GPU is available for processing."""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"✓ GPU Available: {gpu_name} ({gpu_memory:.2f} GB)")
        return True
    else:
        print("✗ GPU not available. Using CPU (slower).")
        return False

def load_whisper_model(model_size: str = "medium"):
    """Load Whisper model with GPU support if available."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Whisper '{model_size}' model on {device.upper()}...")
    model = whisper.load_model(model_size, device=device)
    print(f"✓ Model loaded successfully on {device.upper()}")
    return model

def connect_to_database():
    """Establish connection to MySQL database."""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        print(f"✓ Connected to database: {DB_CONFIG['database']}")
        return connection
    except mysql.connector.Error as err:
        print(f"✗ Database connection failed: {err}")
        sys.exit(1)

def fetch_audio_records(connection) -> List[Dict]:
    """Fetch all audio records from audiodb table."""
    cursor = connection.cursor(dictionary=True)
    
    # Join with subjectsdb to get subject names
    query = """
    SELECT 
        a.id,
        a.subjectId,
        a.qset,
        a.departmentId,
        a.code_a,
        a.code_b,
        a.code_t,
        a.audio1,
        a.audio2,
        a.testaudio,
        a.passage1,
        a.passage2,
        a.textPassageA,
        a.textPassageB,
        s.subject_name,
        s.subject_name_short
    FROM audiodb a
    LEFT JOIN subjectsdb s ON a.subjectId = s.subjectId
    ORDER BY a.subjectId, a.qset
    """
    cursor.execute(query)
    records = cursor.fetchall()
    cursor.close()
    
    print(f"✓ Fetched {len(records)} audio records from database")
    return records

def detect_language_from_subject(subject_name: Optional[str]) -> str:
    """Detect language based on subject name."""
    if subject_name is None:
        return "auto"
    
    subject_lower = subject_name.lower()
    
    if 'hindi' in subject_lower or 'हिंदी' in subject_lower:
        return 'hi'
    elif 'marathi' in subject_lower or 'मराठी' in subject_lower:
        return 'mr'
    elif 'english' in subject_lower:
        return 'en'
    else:
        return "auto"

def download_audio(url: str, timeout: int = 60) -> Optional[bytes]:
    """Download audio file from URL."""
    if not url or url.strip() == '':
        return None
    
    try:
        # Handle S3 and other URLs
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()
        return response.content
    except requests.RequestException as e:
        print(f"  ⚠ Failed to download audio: {e}")
        return None

def extract_first_30_seconds(audio_bytes: bytes, format: str = "mp3") -> Optional[bytes]:
    """Extract first 30 seconds from audio file."""
    try:
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
        
        # Extract first 30 seconds (30000 milliseconds)
        duration_ms = AUDIO_DURATION_SECONDS * 1000
        first_30_sec = audio[:duration_ms]
        
        # Convert to mono and set sample rate for Whisper
        first_30_sec = first_30_sec.set_channels(1).set_frame_rate(SAMPLE_RATE)
        
        # Export to bytes
        output = io.BytesIO()
        first_30_sec.export(output, format="wav")
        output.seek(0)
        
        return output.read()
    except Exception as e:
        print(f"  ⚠ Failed to process audio: {e}")
        return None

def transcribe_audio(model, audio_bytes: bytes, language: str = "auto") -> Dict:
    """Transcribe audio using Whisper model."""
    try:
        # Save audio to temporary file (Whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name
        
        try:
            # Transcribe with language detection or specified language
            options = {}
            if language != "auto":
                options['language'] = language
            
            result = model.transcribe(temp_path, **options)
            
            return {
                'success': True,
                'text': result['text'].strip(),
                'language': result.get('language', language),
                'segments': result.get('segments', [])
            }
        finally:
            # Clean up temp file
            os.unlink(temp_path)
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'language': language
        }

def get_audio_format_from_url(url: str) -> str:
    """Detect audio format from URL."""
    url_lower = url.lower()
    if '.mp3' in url_lower:
        return 'mp3'
    elif '.wav' in url_lower:
        return 'wav'
    elif '.ogg' in url_lower:
        return 'ogg'
    elif '.m4a' in url_lower:
        return 'm4a'
    else:
        return 'mp3'  # Default to mp3

def process_single_audio(model, url: str, audio_type: str, language: str) -> Dict:
    """Process a single audio file: download, extract 30s, transcribe."""
    if not url or url.strip() == '':
        return {
            'url': url,
            'type': audio_type,
            'status': 'skipped',
            'reason': 'No URL provided',
            'transcription': ''
        }
    
    print(f"  Processing {audio_type}: {url[:80]}...")
    
    # Download audio
    audio_bytes = download_audio(url)
    if audio_bytes is None:
        return {
            'url': url,
            'type': audio_type,
            'status': 'failed',
            'reason': 'Download failed',
            'transcription': ''
        }
    
    # Detect format and extract first 30 seconds
    audio_format = get_audio_format_from_url(url)
    processed_audio = extract_first_30_seconds(audio_bytes, audio_format)
    if processed_audio is None:
        return {
            'url': url,
            'type': audio_type,
            'status': 'failed',
            'reason': 'Audio processing failed',
            'transcription': ''
        }
    
    # Transcribe
    result = transcribe_audio(model, processed_audio, language)
    
    if result['success']:
        return {
            'url': url,
            'type': audio_type,
            'status': 'success',
            'transcription': result['text'],
            'detected_language': result['language']
        }
    else:
        return {
            'url': url,
            'type': audio_type,
            'status': 'failed',
            'reason': result.get('error', 'Transcription failed'),
            'transcription': ''
        }

def generate_report(results: List[Dict], output_path: str):
    """Generate a comprehensive report in text format."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("=" * 100 + "\n")
        f.write("AUDIO TRANSCRIPTION REPORT\n")
        f.write("=" * 100 + "\n\n")
        f.write(f"Generated: {timestamp}\n")
        f.write(f"Total Records Processed: {len(results)}\n\n")
        
        # Summary statistics
        total_audios = 0
        successful = 0
        failed = 0
        skipped = 0
        
        for record in results:
            for audio in record.get('audios', []):
                total_audios += 1
                if audio['status'] == 'success':
                    successful += 1
                elif audio['status'] == 'failed':
                    failed += 1
                else:
                    skipped += 1
        
        f.write("-" * 50 + "\n")
        f.write("SUMMARY\n")
        f.write("-" * 50 + "\n")
        f.write(f"Total Audio Files: {total_audios}\n")
        f.write(f"✓ Successfully Transcribed: {successful}\n")
        f.write(f"✗ Failed: {failed}\n")
        f.write(f"○ Skipped (No URL): {skipped}\n\n")
        
        # Detailed results
        f.write("=" * 100 + "\n")
        f.write("DETAILED TRANSCRIPTIONS\n")
        f.write("=" * 100 + "\n\n")
        
        for record in results:
            f.write("-" * 80 + "\n")
            f.write(f"Record ID: {record['id']}\n")
            f.write(f"Subject: {record.get('subject_name', 'N/A')} (ID: {record['subjectId']})\n")
            f.write(f"QSet: {record['qset']}\n")
            f.write(f"Department ID: {record.get('departmentId', 'N/A')}\n")
            f.write(f"Detected Language: {record.get('language', 'N/A')}\n")
            f.write("-" * 80 + "\n\n")
            
            for audio in record.get('audios', []):
                f.write(f"  [{audio['type'].upper()}]\n")
                f.write(f"  URL: {audio.get('url', 'N/A')}\n")
                f.write(f"  Status: {audio['status'].upper()}\n")
                
                if audio['status'] == 'success':
                    f.write(f"  Detected Language: {audio.get('detected_language', 'N/A')}\n")
                    f.write(f"  Transcription (First 30 seconds):\n")
                    f.write(f"  {'-' * 40}\n")
                    # Wrap transcription text
                    text = audio['transcription']
                    for i in range(0, len(text), 80):
                        f.write(f"  {text[i:i+80]}\n")
                    f.write(f"  {'-' * 40}\n")
                elif audio['status'] == 'failed':
                    f.write(f"  Reason: {audio.get('reason', 'Unknown error')}\n")
                else:
                    f.write(f"  Reason: {audio.get('reason', 'No URL provided')}\n")
                
                f.write("\n")
            
            f.write("\n")
        
        f.write("=" * 100 + "\n")
        f.write("END OF REPORT\n")
        f.write("=" * 100 + "\n")
    
    print(f"✓ Report saved to: {output_path}")

def generate_json_report(results: List[Dict], output_path: str):
    """Generate a JSON report for programmatic access."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = {
        'generated_at': timestamp,
        'total_records': len(results),
        'results': results
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"✓ JSON report saved to: {output_path}")

def main():
    print("\n" + "=" * 60)
    print("AUDIO TRANSCRIPTION REPORT GENERATOR")
    print("Using GPU-Accelerated Whisper Model")
    print("=" * 60 + "\n")
    
    # Check GPU availability
    has_gpu = check_gpu_availability()
    
    # Load Whisper model
    # Use 'medium' model for better accuracy with Hindi/Marathi
    # Options: tiny, base, small, medium, large
    model_size = "medium" if has_gpu else "small"
    model = load_whisper_model(model_size)
    
    # Connect to database
    connection = connect_to_database()
    
    try:
        # Fetch audio records
        records = fetch_audio_records(connection)
        
        if len(records) == 0:
            print("No audio records found in the database.")
            return
        
        # Process each record
        results = []
        for i, record in enumerate(records, 1):
            print(f"\n[{i}/{len(records)}] Processing Record ID: {record['id']}")
            print(f"  Subject: {record.get('subject_name', 'Unknown')} (ID: {record['subjectId']})")
            print(f"  QSet: {record['qset']}")
            
            # Detect language from subject name
            language = detect_language_from_subject(record.get('subject_name'))
            print(f"  Language: {language if language != 'auto' else 'Auto-detect'}")
            
            # Process each audio file
            audios = []
            
            # Passage 1 (Audio 1)
            if record.get('passage1'):
                audio_result = process_single_audio(model, record['passage1'], 'passage1', language)
                audios.append(audio_result)
                if audio_result['status'] == 'success':
                    print(f"    ✓ Passage1 transcribed ({len(audio_result['transcription'])} chars)")
            
            # Passage 2 (Audio 2)
            if record.get('passage2'):
                audio_result = process_single_audio(model, record['passage2'], 'passage2', language)
                audios.append(audio_result)
                if audio_result['status'] == 'success':
                    print(f"    ✓ Passage2 transcribed ({len(audio_result['transcription'])} chars)")
            
            # Test Audio
            if record.get('testaudio'):
                audio_result = process_single_audio(model, record['testaudio'], 'testaudio', language)
                audios.append(audio_result)
                if audio_result['status'] == 'success':
                    print(f"    ✓ TestAudio transcribed ({len(audio_result['transcription'])} chars)")
            
            results.append({
                'id': record['id'],
                'subjectId': record['subjectId'],
                'qset': record['qset'],
                'departmentId': record.get('departmentId'),
                'subject_name': record.get('subject_name'),
                'subject_name_short': record.get('subject_name_short'),
                'language': language,
                'audios': audios
            })
        
        # Generate reports
        report_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Text report
        text_report_path = os.path.join(report_dir, 'audio_transcription_report.txt')
        generate_report(results, text_report_path)
        
        # JSON report
        json_report_path = os.path.join(report_dir, 'audio_transcription_report.json')
        generate_json_report(results, json_report_path)
        
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE!")
        print("=" * 60)
        print(f"\nReports generated:")
        print(f"  1. {text_report_path}")
        print(f"  2. {json_report_path}")
        
    finally:
        connection.close()
        print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()
