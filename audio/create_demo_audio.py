#!/usr/bin/env python3
"""
Demo audio creation using Text-to-Speech
Creates actual audio files for offline use
"""

import json
import os
import subprocess
import sys
from pathlib import Path

def install_gtts():
    """Install Google Text-to-Speech if not available"""
    try:
        import gtts
        return True
    except ImportError:
        print("Installing gTTS (Google Text-to-Speech)...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'gtts'])
            import gtts
            return True
        except:
            print("❌ Could not install gTTS. Using alternative method.")
            return False

def create_audio_file(text, filename, qari_style="ar"):
    """Create audio file using TTS"""
    try:
        from gtts import gTTS
        
        # Configure TTS based on qari style
        if "abdul_basit" in filename:
            tts = gTTS(text=text, lang='ar', slow=True)  # Slow and clear
        elif "mishary" in filename:
            tts = gTTS(text=text, lang='ar', slow=False)  # Normal speed
        else:
            tts = gTTS(text=text, lang='ar', slow=False)  # Default
        
        tts.save(filename)
        return True
    except Exception as e:
        print(f"Error creating {filename}: {e}")
        return False

def create_demo_files():
    """Create demo audio files"""
    
    # Check if gTTS is available
    if not install_gtts():
        print("Using espeak as fallback...")
        return create_espeak_files()
    
    # Load manifest
    with open('audio_manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    created_files = 0
    
    print("🎵 Creating demo audio files...")
    
    # Create audio for each word
    for verse in manifest["surah_1"]["verses"]:
        for word_data in verse["words"]:
            word = word_data["word"]
            transliteration = word_data["transliteration"]
            audio_filename = word_data["audio"]
            
            # Create audio for each qari
            for qari in ["abdul_basit", "mishary", "sudais"]:
                qari_dir = f"qaris/{qari}"
                os.makedirs(qari_dir, exist_ok=True)
                
                audio_path = f"{qari_dir}/{audio_filename}"
                
                if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 1000:
                    print(f"Creating: {audio_path}")
                    
                    # Use Arabic text for TTS
                    if create_audio_file(word, audio_path, qari):
                        created_files += 1
                        print(f"✅ Created: {word} ({transliteration})")
                    else:
                        print(f"❌ Failed: {word}")
    
    print(f"🎉 Created {created_files} audio files!")
    return True

def create_espeak_files():
    """Fallback: Create audio using espeak (if available)"""
    print("Using espeak for audio generation...")
    
    # Load manifest
    with open('audio_manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    created_files = 0
    
    for verse in manifest["surah_1"]["verses"]:
        for word_data in verse["words"]:
            transliteration = word_data["transliteration"]
            audio_filename = word_data["audio"]
            
            # Create audio for each qari
            for qari in ["abdul_basit", "mishary", "sudais"]:
                qari_dir = f"qaris/{qari}"
                os.makedirs(qari_dir, exist_ok=True)
                
                audio_path = f"{qari_dir}/{audio_filename.replace('.mp3', '.wav')}"
                
                if not os.path.exists(audio_path):
                    try:
                        # Use espeak with Arabic text
                        cmd = f'espeak -v ar -s 120 -w "{audio_path}" "{transliteration}"'
                        subprocess.run(cmd, shell=True, check=True)
                        created_files += 1
                        print(f"✅ Created: {transliteration}")
                    except:
                        print(f"❌ Failed: {transliteration}")
    
    return created_files > 0

def create_silent_audio():
    """Create simple audio files for immediate use"""
    print("🔇 Creating minimal audio files for testing...")
    
    # Load manifest
    with open('audio_manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # Create tiny audio files that will work immediately
    for verse in manifest["surah_1"]["verses"]:
        for word_data in verse["words"]:
            audio_filename = word_data["audio"]
            
            for qari in ["abdul_basit", "mishary", "sudais"]:
                qari_dir = f"qaris/{qari}"
                os.makedirs(qari_dir, exist_ok=True)
                
                audio_path = f"{qari_dir}/{audio_filename}"
                
                # Create a minimal valid MP3 file (silent)
                # This is a base64-encoded minimal MP3 file
                minimal_mp3 = bytes.fromhex(
                    "494433030000000000000000000000000000000000000000000000000000"
                    "0000000000000000000000000000000000000000000000000000000000"
                )
                
                with open(audio_path, 'wb') as f:
                    f.write(minimal_mp3)
                
                print(f"📁 Created placeholder: {audio_path}")
    
    print("✅ Created placeholder audio files")
    print("🔄 Replace these with actual recordings for better experience")

def main():
    """Main function"""
    print("🎵 Quran Reader - Local Audio Generator")
    print("=" * 50)
    
    # Try to create real audio files
    if not create_demo_files():
        print("⚠️  Could not create TTS audio files")
        print("📁 Creating placeholder files instead...")
        create_silent_audio()
    
    print("\n✅ Audio setup complete!")
    print("📝 To improve audio quality:")
    print("   1. Replace demo files with actual Qari recordings")
    print("   2. Use high-quality MP3 files")
    print("   3. Maintain consistent naming convention")

if __name__ == "__main__":
    main()