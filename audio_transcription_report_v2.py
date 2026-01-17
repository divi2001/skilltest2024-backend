"""
Audio Transcription Report Generator V2
========================================
Uses faster-whisper with large-v3 model for better Hindi/Marathi accuracy
This is a GPU-accelerated, open-source, free solution.
Generates Excel report with audiodb fields + transcriptions
"""

import os
import sys
import json
import mysql.connector
from datetime import datetime
from pydub import AudioSegment
from typing import Optional, Dict, List
import io
import warnings
import tempfile
import requests
warnings.filterwarnings("ignore")

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    print("faster-whisper not installed. Installing now...")

# Database configuration
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
SAMPLE_RATE = 16000

def install_faster_whisper():
    """Install faster-whisper package."""
    import subprocess
    print("Installing faster-whisper...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
    print("✓ faster-whisper installed successfully")

def check_gpu_availability():
    """Check if GPU is available for processing."""
    import torch
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"✓ GPU Available: {gpu_name} ({gpu_memory:.2f} GB)")
        return True
    else:
        print("✗ GPU not available. Using CPU (slower).")
        return False

def load_faster_whisper_model(model_size: str = "large-v3"):
    """Load faster-whisper model with GPU support."""
    from faster_whisper import WhisperModel
    
    # Check GPU availability
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    
    print(f"Loading faster-whisper '{model_size}' model on {device.upper()} (compute_type: {compute_type})...")
    
    # Load model with GPU support
    model = WhisperModel(
        model_size, 
        device=device,
        compute_type=compute_type,
        download_root=None,  # Use default cache
        num_workers=4  # Parallel processing
    )
    
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
        return None
    
    subject_lower = subject_name.lower()
    
    if 'hindi' in subject_lower or 'हिंदी' in subject_lower:
        return 'hi'
    elif 'marathi' in subject_lower or 'मराठी' in subject_lower:
        return 'mr'
    elif 'english' in subject_lower:
        return 'en'
    else:
        return None  # Auto-detect

def download_audio(url: str, timeout: int = 60) -> Optional[bytes]:
    """Download audio file from URL."""
    if not url or url.strip() == '':
        return None
    
    try:
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()
        return response.content
    except requests.RequestException as e:
        print(f"  ⚠ Failed to download audio: {e}")
        return None

def extract_first_30_seconds(audio_bytes: bytes, format: str = "mp3") -> Optional[str]:
    """Extract first 30 seconds from audio file and save to temp file."""
    try:
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=format)
        
        # Extract first 30 seconds
        duration_ms = AUDIO_DURATION_SECONDS * 1000
        first_30_sec = audio[:duration_ms]
        
        # Convert to mono and set sample rate
        first_30_sec = first_30_sec.set_channels(1).set_frame_rate(SAMPLE_RATE)
        
        # Save to temporary file (faster-whisper needs file path)
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        first_30_sec.export(temp_file.name, format="wav")
        temp_file.close()
        
        return temp_file.name
    except Exception as e:
        print(f"  ⚠ Failed to process audio: {e}")
        return None

def transcribe_audio(model, audio_path: str, language: Optional[str] = None) -> Dict:
    """Transcribe audio using faster-whisper model."""
    try:
        # Transcribe with language hint
        segments, info = model.transcribe(
            audio_path,
            language=language,  # Can be None for auto-detection
            beam_size=5,
            best_of=5,
            temperature=0.0,
            vad_filter=True,  # Voice activity detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Collect all segments
        transcription = ""
        segment_list = []
        
        for segment in segments:
            transcription += segment.text + " "
            segment_list.append({
                'start': segment.start,
                'end': segment.end,
                'text': segment.text
            })
        
        return {
            'success': True,
            'text': transcription.strip(),
            'language': info.language,
            'language_probability': info.language_probability,
            'segments': segment_list
        }
            
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
        return 'mp3'

def process_single_audio(model, url: str, audio_type: str, language: Optional[str]) -> Dict:
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
    
    # Extract first 30 seconds
    audio_format = get_audio_format_from_url(url)
    audio_path = extract_first_30_seconds(audio_bytes, audio_format)
    if audio_path is None:
        return {
            'url': url,
            'type': audio_type,
            'status': 'failed',
            'reason': 'Audio processing failed',
            'transcription': ''
        }
    
    try:
        # Transcribe
        result = transcribe_audio(model, audio_path, language)
        
        if result['success']:
            return {
                'url': url,
                'type': audio_type,
                'status': 'success',
                'transcription': result['text'],
                'detected_language': result['language'],
                'language_probability': result.get('language_probability', 0)
            }
        else:
            return {
                'url': url,
                'type': audio_type,
                'status': 'failed',
                'reason': result.get('error', 'Transcription failed'),
                'transcription': ''
            }
    finally:
        # Clean up temp file
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)

def generate_report(results: List[Dict], output_path: str):
    """Generate a comprehensive report in text format."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("=" * 100 + "\n")
        f.write("AUDIO TRANSCRIPTION REPORT (faster-whisper large-v3)\n")
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
            f.write(f"Target Language: {record.get('language', 'Auto-detect')}\n")
            f.write("-" * 80 + "\n\n")
            
            for audio in record.get('audios', []):
                f.write(f"  [{audio['type'].upper()}]\n")
                f.write(f"  URL: {audio.get('url', 'N/A')}\n")
                f.write(f"  Status: {audio['status'].upper()}\n")
                
                if audio['status'] == 'success':
                    f.write(f"  Detected Language: {audio.get('detected_language', 'N/A')}")
                    prob = audio.get('language_probability', 0)
                    if prob:
                        f.write(f" (confidence: {prob:.2%})\n")
                    else:
                        f.write("\n")
                    f.write(f"  Transcription (First 30 seconds):\n")
                    f.write(f"  {'-' * 40}\n")
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
        'model': 'faster-whisper large-v3',
        'total_records': len(results),
        'results': results
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"✓ JSON report saved to: {output_path}")

def generate_excel_report(records_with_transcriptions: List[Dict], output_path: str):
    """Generate Excel report with all audiodb fields + transcription columns."""
    if not OPENPYXL_AVAILABLE:
        print("⚠ openpyxl not installed. Installing now...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
        print("✓ openpyxl installed. Please restart the script to generate Excel report.")
        return
    
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Audio Transcriptions"
    
    # Define headers (all audiodb fields + transcription columns)
    headers = [
        'id', 'subjectId', 'qset', 'departmentId',
        'code_a', 'code_b', 'code_t',
        'audio1', 'audio2', 'testaudio',
        'passage1', 'passage2',
        'textPassageA', 'textPassageB',
        'subject_name', 'subject_name_short',
        'passage1_transcription', 'passage1_language', 'passage1_confidence',
        'passage2_transcription', 'passage2_language', 'passage2_confidence',
        'testaudio_transcription', 'testaudio_language', 'testaudio_confidence'
    ]
    
    # Write headers with styling
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    # Write data rows
    row_idx = 2
    for record_data in records_with_transcriptions:
        # Get original database fields
        record = record_data['original_record']
        
        # Get transcriptions
        passage1_trans = ''
        passage1_lang = ''
        passage1_conf = ''
        passage2_trans = ''
        passage2_lang = ''
        passage2_conf = ''
        testaudio_trans = ''
        testaudio_lang = ''
        testaudio_conf = ''
        
        for audio in record_data.get('audios', []):
            if audio['type'] == 'passage1' and audio['status'] == 'success':
                passage1_trans = audio.get('transcription', '')
                passage1_lang = audio.get('detected_language', '')
                passage1_conf = f"{audio.get('language_probability', 0):.2%}"
            elif audio['type'] == 'passage2' and audio['status'] == 'success':
                passage2_trans = audio.get('transcription', '')
                passage2_lang = audio.get('detected_language', '')
                passage2_conf = f"{audio.get('language_probability', 0):.2%}"
            elif audio['type'] == 'testaudio' and audio['status'] == 'success':
                testaudio_trans = audio.get('transcription', '')
                testaudio_lang = audio.get('detected_language', '')
                testaudio_conf = f"{audio.get('language_probability', 0):.2%}"
        
        # Write row data
        row_data = [
            record.get('id'),
            record.get('subjectId'),
            record.get('qset'),
            record.get('departmentId'),
            record.get('code_a'),
            record.get('code_b'),
            record.get('code_t'),
            record.get('audio1'),
            record.get('audio2'),
            record.get('testaudio'),
            record.get('passage1'),
            record.get('passage2'),
            record.get('textPassageA'),
            record.get('textPassageB'),
            record.get('subject_name'),
            record.get('subject_name_short'),
            passage1_trans,
            passage1_lang,
            passage1_conf,
            passage2_trans,
            passage2_lang,
            passage2_conf,
            testaudio_trans,
            testaudio_lang,
            testaudio_conf
        ]
        
        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value = value
            cell.alignment = Alignment(vertical='top', wrap_text=True)
        
        row_idx += 1
    
    # Auto-adjust column widths
    for column_cells in ws.columns:
        max_length = 0
        column = column_cells[0].column_letter
        for cell in column_cells:
            try:
                if cell.value:
                    # Limit to reasonable width
                    cell_length = min(len(str(cell.value)), 50)
                    if cell_length > max_length:
                        max_length = cell_length
            except:
                pass
        adjusted_width = max(12, max_length + 2)
        ws.column_dimensions[column].width = adjusted_width
    
    # Set row height for header
    ws.row_dimensions[1].height = 30
    
    # Freeze header row
    ws.freeze_panes = 'A2'
    
    # Save workbook
    wb.save(output_path)
    print(f"✓ Excel report saved to: {output_path}")

def main():
    print("\n" + "=" * 60)
    print("AUDIO TRANSCRIPTION REPORT GENERATOR V2")
    print("Using GPU-Accelerated faster-whisper (large-v3)")
    print("Optimized for Hindi, Marathi, and English")
    print("=" * 60 + "\n")
    
    # Check if faster-whisper is installed
    if not FASTER_WHISPER_AVAILABLE:
        install_faster_whisper()
        print("Please restart the script after installation.")
        return
    
    # Check GPU availability
    has_gpu = check_gpu_availability()
    
    # Load faster-whisper model
    # large-v3 has excellent multilingual support including Hindi/Marathi
    model = load_faster_whisper_model("large-v3")
    
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
            lang_display = language if language else 'Auto-detect'
            print(f"  Language: {lang_display}")
            
            # Process each audio file
            audios = []
            
            # Passage 1
            if record.get('passage1'):
                audio_result = process_single_audio(model, record['passage1'], 'passage1', language)
                audios.append(audio_result)
                if audio_result['status'] == 'success':
                    print(f"    ✓ Passage1 transcribed ({len(audio_result['transcription'])} chars)")
            
            # Passage 2
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
                'audios': audios,
                'original_record': record  # Store original database record for Excel export
            })
        
        # Generate reports
        report_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Excel report (primary output)
        excel_report_path = os.path.join(report_dir, 'audio_transcription_report.xlsx')
        generate_excel_report(results, excel_report_path)
        
        # Text report
        text_report_path = os.path.join(report_dir, 'audio_transcription_report_v2.txt')
        generate_report(results, text_report_path)
        
        # JSON report
        json_report_path = os.path.join(report_dir, 'audio_transcription_report_v2.json')
        generate_json_report(results, json_report_path)
        
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE!")
        print("=" * 60)
        print(f"\nReports generated:")
        print(f"  1. {excel_report_path} (Primary)")
        print(f"  2. {text_report_path}")
        print(f"  3. {json_report_path}")
        
    finally:
        connection.close()
        print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()
