#!/usr/bin/env python3
"""
Marli Agency — Descarga y montaje del anuncio 30s
Generado con Higgsfield AI (kling3_0 pro, 1080x1920)

Ejecutar en tu Mac:
    python3 descargar_y_montar.py

Requisitos:
    - ffmpeg instalado (brew install ffmpeg)
    - Python 3.x
    - Conexión a internet (para descargar los clips de Higgsfield)
"""

import urllib.request
import subprocess
import os
import sys

# ─── Clips generados con Higgsfield (kling3_0 pro, 1080x1920, 15s c/u) ──────

CLIPS = [
    {
        "id":  "01b9c033-21d9-4ba3-82b6-d15a398e6a75",
        "url": "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/"
               "hf_20260527_134248_01b9c033-21d9-4ba3-82b6-d15a398e6a75.mp4",
        "desc": "CLIP 1 (0-15s): Psicóloga agotada → robot Li aparece → transformación",
        "file": "clip1_higgsfield.mp4",
    },
    {
        "id":  "b9a39831-68c3-477e-bb67-615217d9b776",
        "url": "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/"
               "hf_20260527_134242_b9a39831-68c3-477e-bb67-615217d9b776.mp4",
        "desc": "CLIP 2 (15-30s): Sesión tranquila → robot hero → CTA marliagency.com",
        "file": "clip2_higgsfield.mp4",
    },
]

# Audio narración (generado con espeak-ng en español)
AUDIO_CLIP1_URL = (
    "https://raw.githubusercontent.com/marliagency/CALENDARIO-DE-CONTENIDO-/"
    "claude/admiring-tesla-AasgU/marli-ad-assets/audio_clip1.wav"
)
AUDIO_CLIP2_URL = (
    "https://raw.githubusercontent.com/marliagency/CALENDARIO-DE-CONTENIDO-/"
    "claude/admiring-tesla-AasgU/marli-ad-assets/audio_clip2.wav"
)

OUTPUT = "Marli_Final_Higgsfield_30s.mp4"


def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def download(url, dest, label):
    if os.path.exists(dest):
        print(f"  Ya existe: {dest}")
        return
    print(f"  Descargando {label}...")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)"
    })
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        total = int(r.headers.get("Content-Length", 0))
        done = 0
        while True:
            chunk = r.read(65536)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total:
                pct = done * 100 // total
                print(f"\r    {pct}% ({done // 1024}KB / {total // 1024}KB)", end="", flush=True)
        print()


def run(cmd, desc=""):
    print(f"  {desc or ' '.join(cmd[:4])}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ERROR:", result.stderr[-500:])
        sys.exit(1)


def main():
    print("=" * 60)
    print("  Marli Agency — Montaje final 30s (Higgsfield AI)")
    print("=" * 60)

    if not check_ffmpeg():
        print("\nERROR: ffmpeg no encontrado.")
        print("Instala con: brew install ffmpeg")
        sys.exit(1)

    # 1. Descargar clips
    print("\n[1/4] Descargando clips de Higgsfield...")
    for c in CLIPS:
        print(f"\n  {c['desc']}")
        download(c["url"], c["file"], c["id"][:8])

    # 2. Descargar audio (narración + música)
    print("\n[2/4] Descargando audio...")
    download(AUDIO_CLIP1_URL, "audio_clip1.wav", "audio clip 1")
    download(AUDIO_CLIP2_URL, "audio_clip2.wav", "audio clip 2")

    # 3. Añadir audio a cada clip y normalizar
    print("\n[3/4] Mezclando audio con video...")

    run([
        "ffmpeg", "-y",
        "-i", "clip1_higgsfield.mp4",
        "-i", "audio_clip1.wav",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "clip1_audio.mp4"
    ], "Clip 1 + audio")

    run([
        "ffmpeg", "-y",
        "-i", "clip2_higgsfield.mp4",
        "-i", "audio_clip2.wav",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "clip2_audio.mp4"
    ], "Clip 2 + audio")

    # 4. Concatenar clips con transición suave
    print("\n[4/4] Concatenando clips...")

    # Escribir lista para concat
    with open("concat_list.txt", "w") as f:
        f.write("file 'clip1_audio.mp4'\n")
        f.write("file 'clip2_audio.mp4'\n")

    run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", "concat_list.txt",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        OUTPUT
    ], f"Exportando {OUTPUT}")

    size = os.path.getsize(OUTPUT) // (1024 * 1024)
    print(f"\n✓ Listo: {OUTPUT} ({size}MB)")
    print(f"  Formato: 1080x1920 (9:16), 30s, H.264")
    print(f"\n  Clips generados con Higgsfield kling3_0 pro:")
    for c in CLIPS:
        print(f"    {c['desc']}")
        print(f"    ID: {c['id']}")

    # Limpiar archivos temporales
    for f in ["clip1_audio.mp4", "clip2_audio.mp4", "concat_list.txt"]:
        try:
            os.remove(f)
        except FileNotFoundError:
            pass


if __name__ == "__main__":
    main()
