#!/usr/bin/env python3
"""
Audio generation script for Quran Reader App
This script creates sample audio files for demonstration.
In production, replace with actual Qari recordings.
"""

import os
import json
from pathlib import Path

def create_audio_manifest():
    """Create a manifest file mapping words to audio files"""
    
    # Al-Fatiha words with their audio file mappings
    audio_manifest = {
        "surah_1": {  # Al-Fatiha
            "name": "Al-Fatiha",
            "verses": [
                {
                    "verse_number": 1,
                    "arabic": "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
                    "words": [
                        {"word": "بِسْمِ", "audio": "001_001_001.mp3", "transliteration": "bismi"},
                        {"word": "اللَّهِ", "audio": "001_001_002.mp3", "transliteration": "allahi"},
                        {"word": "الرَّحْمَنِ", "audio": "001_001_003.mp3", "transliteration": "ar-rahmani"},
                        {"word": "الرَّحِيمِ", "audio": "001_001_004.mp3", "transliteration": "ar-raheem"}
                    ]
                },
                {
                    "verse_number": 2,
                    "arabic": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                    "words": [
                        {"word": "الْحَمْدُ", "audio": "001_002_001.mp3", "transliteration": "alhamdu"},
                        {"word": "لِلَّهِ", "audio": "001_002_002.mp3", "transliteration": "lillahi"},
                        {"word": "رَبِّ", "audio": "001_002_003.mp3", "transliteration": "rabbi"},
                        {"word": "الْعَالَمِينَ", "audio": "001_002_004.mp3", "transliteration": "al-alameen"}
                    ]
                },
                {
                    "verse_number": 3,
                    "arabic": "الرَّحْمَنِ الرَّحِيمِ",
                    "words": [
                        {"word": "الرَّحْمَنِ", "audio": "001_003_001.mp3", "transliteration": "ar-rahmani"},
                        {"word": "الرَّحِيمِ", "audio": "001_003_002.mp3", "transliteration": "ar-raheem"}
                    ]
                },
                {
                    "verse_number": 4,
                    "arabic": "مَالِكِ يَوْمِ الدِّينِ",
                    "words": [
                        {"word": "مَالِكِ", "audio": "001_004_001.mp3", "transliteration": "maliki"},
                        {"word": "يَوْمِ", "audio": "001_004_002.mp3", "transliteration": "yawmi"},
                        {"word": "الدِّينِ", "audio": "001_004_003.mp3", "transliteration": "ad-deen"}
                    ]
                },
                {
                    "verse_number": 5,
                    "arabic": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
                    "words": [
                        {"word": "إِيَّاكَ", "audio": "001_005_001.mp3", "transliteration": "iyyaka"},
                        {"word": "نَعْبُدُ", "audio": "001_005_002.mp3", "transliteration": "na'budu"},
                        {"word": "وَإِيَّاكَ", "audio": "001_005_003.mp3", "transliteration": "wa-iyyaka"},
                        {"word": "نَسْتَعِينُ", "audio": "001_005_004.mp3", "transliteration": "nasta'een"}
                    ]
                },
                {
                    "verse_number": 6,
                    "arabic": "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                    "words": [
                        {"word": "اهْدِنَا", "audio": "001_006_001.mp3", "transliteration": "ihdina"},
                        {"word": "الصِّرَاطَ", "audio": "001_006_002.mp3", "transliteration": "as-sirata"},
                        {"word": "الْمُسْتَقِيمَ", "audio": "001_006_003.mp3", "transliteration": "al-mustaqeem"}
                    ]
                },
                {
                    "verse_number": 7,
                    "arabic": "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
                    "words": [
                        {"word": "صِرَاطَ", "audio": "001_007_001.mp3", "transliteration": "sirata"},
                        {"word": "الَّذِينَ", "audio": "001_007_002.mp3", "transliteration": "allatheena"},
                        {"word": "أَنْعَمْتَ", "audio": "001_007_003.mp3", "transliteration": "an'amta"},
                        {"word": "عَلَيْهِمْ", "audio": "001_007_004.mp3", "transliteration": "alayhim"},
                        {"word": "غَيْرِ", "audio": "001_007_005.mp3", "transliteration": "ghayri"},
                        {"word": "الْمَغْضُوبِ", "audio": "001_007_006.mp3", "transliteration": "al-maghdoobi"},
                        {"word": "عَلَيْهِمْ", "audio": "001_007_007.mp3", "transliteration": "alayhim"},
                        {"word": "وَلَا", "audio": "001_007_008.mp3", "transliteration": "wala"},
                        {"word": "الضَّالِّينَ", "audio": "001_007_009.mp3", "transliteration": "ad-dalleen"}
                    ]
                }
            ]
        },
        "qaris": {
            "abdul_basit": {
                "name": "Sheikh Abdul Basit Abdul Samad",
                "style": "Mujawwad (Slow & Clear)",
                "enabled": True
            },
            "mishary": {
                "name": "Sheikh Mishary Rashid Alafasy",
                "style": "Murattal (Moderate)",
                "enabled": True
            },
            "sudais": {
                "name": "Sheikh Abdul Rahman Al-Sudais",
                "style": "Murattal (Clear)",
                "enabled": True
            }
        }
    }
    
    return audio_manifest

def create_placeholder_audio_files():
    """Create placeholder audio files"""
    manifest = create_audio_manifest()
    
    # Create placeholder MP3 files for each word
    qaris = ["abdul_basit", "mishary", "sudais"]
    
    for qari in qaris:
        qari_dir = f"qaris/{qari}"
        os.makedirs(qari_dir, exist_ok=True)
        
        # Create audio files for each word in Al-Fatiha
        for verse in manifest["surah_1"]["verses"]:
            for word_data in verse["words"]:
                audio_file = f"{qari_dir}/{word_data['audio']}"
                if not os.path.exists(audio_file):
                    # Create a small placeholder file (in production, use actual audio)
                    with open(audio_file, 'w') as f:
                        f.write(f"# Placeholder for {word_data['word']} by {qari}\n")
                        f.write(f"# Transliteration: {word_data['transliteration']}\n")
                        f.write(f"# Replace with actual MP3 audio file\n")

def main():
    """Main function to generate audio manifest and placeholder files"""
    
    # Create audio manifest
    manifest = create_audio_manifest()
    
    # Save manifest as JSON
    with open('audio_manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    # Create placeholder audio files
    create_placeholder_audio_files()
    
    print("✅ Audio manifest created: audio_manifest.json")
    print("✅ Placeholder audio files created in qaris/ directories")
    print("📝 Replace placeholder files with actual MP3 recordings")
    print("🎵 Recommended: Use actual Qari recordings for best experience")

if __name__ == "__main__":
    main()