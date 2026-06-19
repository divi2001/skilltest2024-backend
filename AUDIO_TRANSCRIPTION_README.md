# Audio Transcription Report Generator - Summary

## Overview
Created a GPU-accelerated audio transcription system using **faster-whisper large-v3** model to transcribe audio files from the `audiodb` database.

## Features
✅ **GPU Accelerated**: Uses NVIDIA RTX 4090 for fast processing  
✅ **Multilingual Support**: Optimized for Hindi, Marathi, and English  
✅ **First 30 Seconds**: Extracts and transcribes only the first 30 seconds of each audio  
✅ **Multiple Output Formats**: Excel (primary), Text, and JSON reports  
✅ **Complete Database Fields**: Includes all `audiodb` fields plus transcription columns

## Files Created

### 1. `audio_transcription_report_v2.py`
- Main script that processes all audio files from the database
- Uses `passage1`, `passage2`, and `testaudio` columns for audio URLs
- Generates comprehensive reports with transcriptions

### 2. Output Reports
- **`audio_transcription_report.xlsx`** (Primary) - Excel spreadsheet with:
  - All original `audiodb` fields (id, subjectId, qset, departmentId, etc.)
  - Audio URL columns (passage1, passage2, testaudio)
  - Transcription columns: `passage1_transcription`, `passage2_transcription`, `testaudio_transcription`
  - Language detection: `passage1_language`, `passage2_language`, `testaudio_language`
  - Confidence scores: `passage1_confidence`, `passage2_confidence`, `testaudio_confidence`

- **`audio_transcription_report_v2.txt`** - Human-readable text report
- **`audio_transcription_report_v2.json`** - JSON format for programmatic access

## Excel Report Structure

| Column | Description |
|--------|-------------|
| id | Database record ID |
| subjectId | Subject identifier |
| qset | Question set number |
| departmentId | Department identifier |
| code_a, code_b, code_t | Shorthand codes |
| audio1, audio2, testaudio | Original audio URL fields |
| passage1, passage2 | Audio passage URLs (used for transcription) |
| textPassageA, textPassageB | Text passages |
| subject_name, subject_name_short | Subject information |
| **passage1_transcription** | First 30s transcription of passage1 audio |
| **passage1_language** | Detected language (hi/mr/en) |
| **passage1_confidence** | Language detection confidence % |
| **passage2_transcription** | First 30s transcription of passage2 audio |
| **passage2_language** | Detected language |
| **passage2_confidence** | Confidence % |
| **testaudio_transcription** | First 30s transcription of test audio |
| **testaudio_language** | Detected language |
| **testaudio_confidence** | Confidence % |

## How to Run

```bash
cd "c:\freelancer\kk exams software\skilltest2024-backend"
python audio_transcription_report_v2.py
```

## Current Status
- ✅ Script created and updated with Excel export
- ✅ All required packages installed (faster-whisper, openpyxl, pydub, mysql-connector-python)
- ⏳ Model downloading (faster-whisper large-v3, ~3GB) - Currently at 65%
- ⏳ Awaiting transcription completion

## Why faster-whisper large-v3?
1. **Better Indian Language Support**: Significantly better accuracy for Hindi & Marathi compared to standard Whisper
2. **Faster Processing**: 4× faster than standard Whisper with same accuracy
3. **GPU Optimized**: Efficiently uses your RTX 4090
4. **Open Source & Free**: No API keys required

## Database Connection
- Host: 13.204.48.33
- Database: dec25
- Tables: `audiodb`, `subjectsdb`

## Audio Processing
- Downloads audio from S3 URLs in `passage1`, `passage2`, `testaudio` columns
- Extracts first 30 seconds only
- Converts to 16kHz mono WAV for optimal transcription
- Transcribes using GPU-accelerated model
- Stores transcription + detected language + confidence score

## Expected Results
- 30 records from audiodb
- Each record can have up to 3 audio files (passage1, passage2, testaudio)
- Total: Up to 90 transcriptions
- Languages: English, Hindi, Marathi auto-detected

## Next Steps
1. Wait for model download to complete (~1-2 more minutes)
2. Script will automatically process all audio records
3. Excel report will be generated at: `audio_transcription_report.xlsx`
4. Open Excel file to review transcriptions
