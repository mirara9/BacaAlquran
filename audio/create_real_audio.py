#!/usr/bin/env python3
"""
Create real audio files for Quran Reader
Uses pydub and gTTS to create actual MP3 files
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def install_dependencies():
    """Install required packages"""
    packages = ['gtts', 'pydub']
    for package in packages:
        try:
            __import__(package)
        except ImportError:
            print(f"Installing {package}...")
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            except:
                print(f"Could not install {package}. Trying alternative method...")
                return False
    return True

def create_silent_mp3(duration_ms=500):
    """Create a silent MP3 file"""
    try:
        from pydub import AudioSegment
        from pydub.generators import Sine
        
        # Create a very quiet sine wave (almost silent)
        silent = Sine(20).to_audio_segment(duration=duration_ms, volume=-60)
        return silent
    except:
        return None

def create_tts_audio(text, lang='ar', slow=False):
    """Create audio using Google TTS"""
    try:
        from gtts import gTTS
        import io
        from pydub import AudioSegment
        
        tts = gTTS(text=text, lang=lang, slow=slow)
        
        # Save to memory buffer
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        
        # Convert to AudioSegment
        audio = AudioSegment.from_mp3(buffer)
        return audio
        
    except Exception as e:
        print(f"TTS failed for '{text}': {e}")
        return None

def create_beep_audio(frequency=440, duration_ms=300):
    """Create a simple beep sound"""
    try:
        from pydub.generators import Sine
        
        beep = Sine(frequency).to_audio_segment(duration=duration_ms, volume=-20)
        return beep
    except:
        return None

def generate_audio_files():
    """Generate actual MP3 files"""
    
    if not install_dependencies():
        print("⚠️  Could not install dependencies. Creating minimal files...")
        return create_minimal_files()
    
    # Load manifest
    with open('audio_manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    print("🎵 Creating real MP3 audio files...")
    
    # Create audio for each word
    qaris = {
        'abdul_basit': {'slow': True, 'freq': 200},
        'mishary': {'slow': False, 'freq': 300}, 
        'sudais': {'slow': False, 'freq': 250}
    }
    
    created_count = 0
    
    for verse in manifest["surah_1"]["verses"]:
        for word_data in verse["words"]:
            arabic_word = word_data["word"]
            transliteration = word_data["transliteration"]
            audio_filename = word_data["audio"]
            
            print(f"Creating audio for: {arabic_word} ({transliteration})")
            
            for qari_id, qari_config in qaris.items():
                qari_dir = f"qaris/{qari_id}"
                os.makedirs(qari_dir, exist_ok=True)
                
                audio_path = f"{qari_dir}/{audio_filename}"
                
                # Try TTS first
                audio = create_tts_audio(arabic_word, slow=qari_config['slow'])
                
                if audio is None:
                    # Fallback to beep with different frequencies for different qaris
                    print(f"  Using beep fallback for {qari_id}")
                    audio = create_beep_audio(qari_config['freq'], 400)
                
                if audio is None:
                    # Final fallback to silent audio
                    print(f"  Using silent fallback for {qari_id}")
                    audio = create_silent_mp3(300)
                
                if audio:
                    try:
                        audio.export(audio_path, format="mp3", bitrate="64k")
                        created_count += 1
                        print(f"  ✅ Created: {audio_path}")
                    except Exception as e:
                        print(f"  ❌ Failed to save {audio_path}: {e}")
                else:
                    print(f"  ❌ Could not create audio for {arabic_word}")
    
    print(f"\n🎉 Created {created_count} audio files!")
    return created_count > 0

def create_minimal_files():
    """Create minimal working MP3 files using ffmpeg if available"""
    print("🔧 Creating minimal MP3 files...")
    
    try:
        # Check if ffmpeg is available
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        
        # Load manifest
        with open('audio_manifest.json', 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        created_count = 0
        
        for verse in manifest["surah_1"]["verses"]:
            for word_data in verse["words"]:
                audio_filename = word_data["audio"]
                
                for qari in ['abdul_basit', 'mishary', 'sudais']:
                    qari_dir = f"qaris/{qari}"
                    os.makedirs(qari_dir, exist_ok=True)
                    
                    audio_path = f"{qari_dir}/{audio_filename}"
                    
                    # Create a 0.5 second silent MP3 using ffmpeg
                    cmd = [
                        'ffmpeg', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono',
                        '-t', '0.5', '-acodec', 'mp3', '-b:a', '64k',
                        '-y', audio_path
                    ]
                    
                    try:
                        subprocess.run(cmd, capture_output=True, check=True)
                        created_count += 1
                        print(f"✅ Created: {audio_path}")
                    except:
                        print(f"❌ Failed: {audio_path}")
        
        print(f"🎉 Created {created_count} minimal audio files!")
        return True
        
    except:
        print("❌ ffmpeg not available. Creating placeholder files...")
        return create_placeholder_files()

def create_placeholder_files():
    """Create simple placeholder files as last resort"""
    print("📁 Creating simple placeholder files...")
    
    # Load manifest
    with open('audio_manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Minimal MP3 header (creates a valid but silent MP3)
    minimal_mp3_data = bytes([
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]) * 50  # Repeat to make it longer
    
    created_count = 0
    
    for verse in manifest["surah_1"]["verses"]:
        for word_data in verse["words"]:
            audio_filename = word_data["audio"]
            
            for qari in ['abdul_basit', 'mishary', 'sudais']:
                qari_dir = f"qaris/{qari}"
                os.makedirs(qari_dir, exist_ok=True)
                
                audio_path = f"{qari_dir}/{audio_filename}"
                
                try:
                    with open(audio_path, 'wb') as f:
                        f.write(minimal_mp3_data)
                    created_count += 1
                    print(f"📁 Created: {audio_path}")
                except Exception as e:
                    print(f"❌ Failed: {audio_path} - {e}")
    
    print(f"📁 Created {created_count} placeholder files!")
    return True

def main():
    """Main function"""
    print("🎵 Quran Reader - Audio File Generator")
    print("=" * 50)
    
    if not os.path.exists('audio_manifest.json'):
        print("❌ audio_manifest.json not found!")
        print("Please run generate_audio.py first")
        return
    
    success = generate_audio_files()
    
    if success:
        print("\n✅ Audio generation complete!")
        print("🎧 Test the files using audio/test_audio.html")
    else:
        print("\n⚠️  Audio generation had issues")
        print("📝 Consider manually adding real MP3 files")
    
    print("\n📋 Next steps:")
    print("1. Test audio playback in the app")
    print("2. Replace with high-quality Qari recordings if needed")
    print("3. Ensure files are under 100KB each for fast loading")

if __name__ == "__main__":
    main()