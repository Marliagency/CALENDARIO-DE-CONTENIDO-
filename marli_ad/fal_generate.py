#!/usr/bin/env python3
"""fal_generate.py — Marli v2 ad assets via fal.ai REST API.

Sigue las reglas del proyecto:
  * Wan 2.6 para drafts ($0.05/s)         · Kling 3.0 para cine ($0.029/s)
  * Kling Avatar v2 Std talking-head ($0.056/s)
  * 1080p o menos, audio OFF salvo UGC, dur minima, 24 fps, 1 resultado.
  * Preflight de coste por generacion; freno automatico si una sola pasa de $1.

Uso desde tu Mac:
    export FAL_KEY="<key_id>:<secret>"
    python3 fal_generate.py draft    # 6 beats como drafts Wan 2.6 (~$1.50 total)
    python3 fal_generate.py final    # regen cine+UGC con modelos premium (~$0.57)

Tras `final` ensambla el anuncio v2 (`marli_ad_v2.mp4`) usando music.wav y las cards
hibridas (fondo IA + texto en post con DM Serif Display + Space Grotesk).
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error

KEY = os.environ.get("FAL_KEY")
if not KEY:
    sys.exit("falta FAL_KEY en env. export FAL_KEY='<key_id>:<secret>'")
HDR = {"Authorization": f"Key {KEY}", "Content-Type": "application/json"}
FAL = "https://queue.fal.run"
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

MAX_GEN = 1.00            # paro si una sola gen excede este precio
running = 0.0             # gasto acumulado en USD

# ---------- prompts compartidos (sin texto, sin marcas, robot Li descrito en cada uno) ----------
LI = ("a small friendly geometric robot mascot with glossy candy-red carbon-fiber body, "
      "smooth white articulated joints, a rounded TV-screen head with a calm soft white smiley face, "
      "no aggressive features, a quiet helpful companion")
OFFICE = ("minimalist modern psychology consultation room, warm cream-colored walls, soft natural "
          "window light, premium editorial 3D render look")

# beat -> (categoria, prompt, draft_model, final_model, with_audio, resolution_final, outfile, dur)
BEATS = {
    "cinematic_1": ("CINE",
        f"{LI} sitting calmly on a wooden desk inside a {OFFICE}. Slow gentle cinematic push-in, "
        "shallow depth of field, reassuring premium mood. Vertical 9:16. No text, no letters, no logos.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/kling-video/v3/standard/text-to-video",
        False, "1080p", 5),
    "bg_problem": ("BG",
        f"Empty {OFFICE} at dawn, papers softly scattered on the desk, calendar on the wall, "
        "very gentle ambient camera drift, vertical 9:16. No people. No text, no letters, no logos.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/wan-25-preview/text-to-video",
        False, "720p", 5),
    "ugc":        ("UGC",
        "Authentic vertical handheld phone-selfie video, a warm female therapist in her 30s in a cream "
        "consultation room with soft window light, looking into the phone camera with a calm relieved "
        "expression, speaking naturally in Spanish: 'Llevo seis meses sin redactar un informe a mano. "
        "Me devolvio mi tiempo.' iPhone front-camera look, slight natural handheld movement.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/kling-video/v2/avatar/standard",
        True, "720p", 5),
    "cinematic_2": ("CINE",
        f"{LI} in the same {OFFICE}, several soft translucent floating cards drift gently around it "
        "with subtle red accents. Smooth slow orbiting camera, premium editorial mood. Vertical 9:16. "
        "No text, no letters, no numbers, no logos.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/kling-video/v3/standard/text-to-video",
        False, "1080p", 5),
    "bg_benefit": ("BG",
        f"{LI} resting peacefully on a shelf in a {OFFICE}, soft warm light, very slow ambient camera. "
        "Vertical 9:16. No text, no letters, no logos.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/wan-25-preview/text-to-video",
        False, "720p", 5),
    "bg_cta":     ("BG",
        f"{LI} smiling warmly head-on, soft cream {OFFICE} blurred behind, golden hour window light, "
        "static composition with empty space at center for type. Vertical 9:16. No text, no letters, no logos.",
        "fal-ai/wan-25-preview/text-to-video",
        "fal-ai/wan-25-preview/text-to-video",
        False, "720p", 5),
}

PRICE_PER_SEC = {
    "fal-ai/wan-25-preview/text-to-video":          0.05,
    "fal-ai/kling-video/v3/standard/text-to-video": 0.029,
    "fal-ai/bytedance/seedance/v2/fast":            0.09,
    "fal-ai/kling-video/v2/avatar/standard":        0.056,
}

# -------------------------------------------------------------------- helpers
def req(url, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=HDR, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {url}\n{e.read().decode()[:500]}")

def submit(model, payload):
    return req(f"{FAL}/{model}", "POST", payload)

def poll(status_url, response_url, label, timeout_s=420):
    t0 = time.time()
    while True:
        s = req(status_url)
        st = s.get("status")
        if st == "COMPLETED":
            return req(response_url)
        if st in ("FAILED", "CANCELLED"):
            sys.exit(f"{label}: gen {st}: {s}")
        if time.time() - t0 > timeout_s:
            sys.exit(f"{label}: timeout polling")
        time.sleep(4)

def download(url, out):
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())

def gen(name, mode):
    global running
    cat, prompt, draft_m, final_m, audio, res_final, dur = BEATS[name]
    model = draft_m if mode == "draft" else final_m
    res = "720p" if mode == "draft" else res_final
    use_audio = audio and mode == "final"
    cost = PRICE_PER_SEC[model] * dur
    if use_audio:                       # audio nativo roughly dobla coste
        cost *= 2
    if cost > MAX_GEN:
        sys.exit(f"{name}: ${cost:.2f} excede ${MAX_GEN}. Aborto (Regla 4).")
    payload = {
        "prompt": prompt,
        "duration": str(dur),
        "aspect_ratio": "9:16",
        "resolution": res,
    }
    if "kling-video/v3" in model:
        payload["negative_prompt"] = "text, letters, logos, watermarks, distorted hands, blurry"
    if "wan-25" in model:
        payload["enable_safety_checker"] = True
    out = f"{name}.mp4"
    print(f"  [{cat}] -> {model.split('/',2)[-1]} -> {dur}s/{res}/{'audio' if use_audio else 'no-audio'} -> ~${cost:.2f} -> {out}", flush=True)
    j = submit(model, payload)
    res_json = poll(j["status_url"], j["response_url"], name)
    vid = (res_json.get("video") or {}).get("url") or (res_json.get("output") or {}).get("url")
    if not vid:
        sys.exit(f"{name}: no video URL en respuesta:\n{res_json}")
    download(vid, out)
    running += cost
    print(f"        listo. acumulado ~${running:.2f}", flush=True)

# -------------------------------------------------------------------- hybrid cards (post-text)
DM = "fonts/DMSerifDisplay-Regular.ttf"
SG = "fonts/SpaceGrotesk.ttf"
INK, RED, GREY = "0x2C2C2C", "0xE24B4A", "0x6B6B6B"

def run_ff(args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True, stdin=subprocess.DEVNULL)

def card_overlay(bg_in, out, vf_chain):
    # bg + a soft cream scrim band behind text + drawtext stack
    scrim = "drawbox=x=0:y=ih*0.30:w=iw:h=ih*0.50:color=0xFAF6F1@0.78:t=fill"
    run_ff(["-i", bg_in, "-vf",
            f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,{scrim},{vf_chain},format=yuv420p",
            "-t", "5", "-c:v", "libx264", "-crf", "16", "-preset", "fast", out])

def text(txt, fs, color, y, font, ti=0.2):
    return (f"drawtext=fontfile={font}:text='{txt}':fontsize={fs}:fontcolor={color}:"
            f"alpha='clip((t-{ti})/0.4\\,0\\,1)':x=(w-text_w)/2:y='{y}+45*(1-clip((t-{ti})/0.4\\,0\\,1))'")

def pill(label, y, ti):
    return (f"drawbox=x=(iw-780)/2:y={y}:w=780:h=112:color={RED}:t=fill:enable='gte(t,{ti})',"
            f"drawtext=fontfile={SG}:text='{label}':fontsize=42:fontcolor=white:"
            f"x=(w-text_w)/2:y={y}+34:enable='gte(t,{ti})'")

def build_cards():
    print("Construyendo cards hibridas (fondo IA + DM Serif + Space Grotesk)...", flush=True)
    p = ",".join([
        text("EL PROBLEMA", 44, GREY, 540, SG, 0.10),
        text("+8 HORAS",   150, RED,  680, DM, 0.40),
        text("a la semana en gestion", 50, INK, 920, SG, 0.95),
        text("marli", 46, RED, 1760, DM),
    ])
    card_overlay("bg_problem.mp4", "card_problem.mp4", p)
    b = ",".join([
        text("LA DIFERENCIA", 44, GREY, 540, SG, 0.10),
        text("Pago unico", 130, RED, 680, DM, 0.40),
        text("Se queda contigo para siempre", 50, INK, 920, SG, 0.95),
        text("Sin cuotas. Sin sorpresas.", 42, GREY, 1000, SG, 1.30),
        text("marli", 46, RED, 1760, DM),
    ])
    card_overlay("bg_benefit.mp4", "card_benefit.mp4", b)
    c = ",".join([
        text("Automatiza tu consulta", 60, INK, 600, SG, 0.20),
        text("en menos de 1 hora", 78, RED, 700, DM, 0.55),
        text("Sin cuotas. Sin tecnicos.", 42, GREY, 830, SG, 1.05),
        pill("AGENDA TU LLAMADA GRATIS", 1050, 1.45),
        text("marliagency.com", 46, INK, 1230, SG, 1.95),
    ]) + f",fade=t=out:st=4.5:d=0.5"
    card_overlay("bg_cta.mp4", "card_cta.mp4", c)

# -------------------------------------------------------------------- final assembly
def beat(in_clip, music_start, audio_mode, out, overlay_vf=""):
    # audio_mode: "music" (cards + cinematic), "ugc" (voice + low music)
    if audio_mode == "ugc":
        fc = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
              f"{','+overlay_vf if overlay_vf else ''},format=yuv420p[v];"
              f"[0:a]volume=1.15[va];"
              f"[1:a]atrim={music_start}:{music_start+5},asetpts=PTS-STARTPTS,volume=0.07[vm];"
              f"[va][vm]amix=inputs=2:duration=first:weights='1.15 0.07'[a]")
    else:
        fc = (f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
              f"{','+overlay_vf if overlay_vf else ''},format=yuv420p[v];"
              f"[1:a]atrim={music_start}:{music_start+5},asetpts=PTS-STARTPTS,volume=0.85[a]")
    run_ff(["-t", "5", "-i", in_clip, "-i", "music.wav", "-filter_complex", fc,
            "-map", "[v]", "-map", "[a]", "-r", "30", "-t", "5",
            "-c:v", "libx264", "-crf", "16", "-preset", "medium",
            "-c:a", "aac", "-b:a", "192k", out])

def assemble():
    print("Ensamblando anuncio v2...", flush=True)
    # cinematic 1 + overlay
    ov1 = ",".join([
        text("Tu consulta funciona.", 56, "white", 1340, SG, 0.4),
        text("Pero depende solo de ti.", 56, RED, 1430, DM, 0.95),
    ])
    # cinematic 2 + overlay
    ov2 = ",".join([
        text("Conoce a Li.", 70, RED, 1330, DM, 0.4),
        text("Tu asistente que nunca descansa.", 44, "white", 1440, SG, 0.95),
    ])
    # UGC subtitle pill
    ugc_ov = (f"drawbox=x=(iw-720)/2:y=1640:w=720:h=84:color=black@0.55:t=fill,"
              f"drawtext=fontfile={SG}:text='PSICOLOGA - CONSULTA PRIVADA':fontsize=40:fontcolor=white:"
              f"x=(w-text_w)/2:y=1664")
    # cinematic beats need a lower scrim for white text
    cine_scrim = "drawbox=x=0:y=ih*0.66:w=iw:h=ih*0.34:color=black@0.42:t=fill"
    beat("cinematic_1.mp4", 0,  "music", "beat1.mp4", f"{cine_scrim},{ov1}")
    beat("card_problem.mp4", 5,  "music", "beat2.mp4", "")
    beat("ugc.mp4",          10, "ugc",   "beat3.mp4", ugc_ov)
    beat("cinematic_2.mp4", 15, "music", "beat4.mp4", f"{cine_scrim},{ov2}")
    beat("card_benefit.mp4", 20, "music", "beat5.mp4", "")
    beat("card_cta.mp4",     25, "music", "beat6.mp4", "")
    with open("concat_v2.txt", "w") as f:
        for i in range(1, 7):
            f.write(f"file 'beat{i}.mp4'\n")
    run_ff(["-f", "concat", "-safe", "0", "-i", "concat_v2.txt",
            "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "marli_ad_v2.mp4"])
    print("LISTO -> marli_ad_v2.mp4", flush=True)

# -------------------------------------------------------------------- main
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "draft"
    if mode not in ("draft", "final"):
        sys.exit("uso: python3 fal_generate.py [draft|final]")
    print(f"== Modo {mode.upper()} ==\n", flush=True)
    if mode == "draft":
        targets = list(BEATS.keys())
    else:
        # final: regen solo cine + UGC; los bg drafts se reutilizan
        targets = ["cinematic_1", "ugc", "cinematic_2"]
        missing = [n for n in ("bg_problem", "bg_benefit", "bg_cta") if not os.path.exists(f"{n}.mp4")]
        if missing:
            sys.exit(f"falta(n) {missing}. Corre primero: python3 fal_generate.py draft")
    for n in targets:
        gen(n, mode)
    build_cards()
    assemble()
    print(f"\nTotal gastado en esta corrida: ~${running:.2f}")

if __name__ == "__main__":
    main()
