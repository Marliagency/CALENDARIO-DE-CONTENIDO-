#!/usr/bin/env python3
"""comfy_generate.py — orquestador de produccion para anuncios Marli.

Lee un YAML de config (ver configs/marli_v2.yaml + PRODUCTION.md) y produce el
anuncio entero hablando con la API HTTP de ComfyUI (puerto 8188 del pod).

Soporta los 4 formatos:
  CINEMATIC    -> Wan 2.2 14B Text-to-Video
  UGC          -> Wan 2.2 14B + voz (TTS ElevenLabs opcional) + lip-sync opcional
  TEXT_CARD    -> FLUX.1 dev (1 imagen 1080x1920) + drawtext en post (DM Serif + SG)
  SLIDESHOW_5  -> FLUX.1 dev x5 + concat 1s/imagen + sting de tambor opcional

Variaciones:
  * style preset (editorial, cinematic, handheld, studio, golden-hour, noir)
  * camera preset (static, slow-push-in, slow-orbit, dolly-*, handheld)
  * duration / slide_dur / transition
  * seed fija (repetible) o 'random' (variaciones del mismo prompt)

Uso:
    export COMFY_HOST="http://<POD-IP>:8188"
    export ELEVENLABS_KEY="..."           # solo si algun beat usa tts
    python3 comfy_generate.py configs/marli_v2.yaml
    # -> outputs/<ad.name>/beat<n>_<type>_<id>.mp4 + <ad.name>.mp4 final
"""
import json, os, random, subprocess, sys, time, urllib.request, urllib.error, uuid
try:
    import yaml
except ImportError:
    sys.exit("falta PyYAML: pip install pyyaml")

# ------------------------------------------------------------------ presets
STYLE_SUFFIX = {
    "editorial":   ", premium editorial advertising style, soft cream tones, Sony A7R look, shallow depth of field",
    "cinematic":   ", cinematic, anamorphic lens, dramatic key light, film grain, ARRI Alexa look",
    "handheld":    ", handheld phone selfie, slight natural shake, iPhone front-camera aesthetic",
    "studio":      ", clean studio backdrop, soft box lighting, premium product photography",
    "golden-hour": ", warm golden-hour window light, long soft shadows",
    "noir":        ", low-key noir lighting, deep shadows, single hard key light",
}
CAMERA_SUFFIX = {
    "static":        "",
    "slow-push-in":  ", slow gentle cinematic push-in",
    "slow-orbit":    ", smooth slow orbiting camera around subject",
    "dolly-left":    ", smooth dolly camera move to the left",
    "dolly-right":   ", smooth dolly camera move to the right",
    "handheld":      ", slight natural handheld movement",
}
NEGATIVE = "text, letters, logos, watermarks, distorted hands, blurry, low quality, deformed"

# ------------------------------------------------------------------ ComfyUI HTTP client
COMFY = os.environ.get("COMFY_HOST", "http://127.0.0.1:8188").rstrip("/")
CLIENT_ID = str(uuid.uuid4())

def comfy_post(path, body):
    req = urllib.request.Request(f"{COMFY}{path}", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def comfy_get(path):
    with urllib.request.urlopen(f"{COMFY}{path}", timeout=30) as r:
        return json.loads(r.read())

def comfy_download(filename, subfolder, ftype, out):
    url = f"{COMFY}/view?filename={filename}&subfolder={subfolder}&type={ftype}"
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())

def load_workflow(name):
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "comfy_workflows", f"{name}.json")) as f:
        return json.load(f)

def patch_text_encoders(wf, positive, negative):
    """Reemplaza prompts en los CLIPTextEncode (asume dos: positive, negative).
    El usuario tiene que etiquetar los nodos en la UI con titulos 'positive'/'negative'."""
    for nid, node in wf.items():
        title = (node.get("_meta") or {}).get("title", "").lower()
        if node.get("class_type", "").startswith("CLIPTextEncode"):
            if "positive" in title:
                node["inputs"]["text"] = positive
            elif "negative" in title:
                node["inputs"]["text"] = negative

def patch_seed(wf, seed):
    for nid, node in wf.items():
        if node.get("class_type") in ("KSampler", "KSamplerAdvanced", "SamplerCustomAdvanced"):
            if "seed" in node["inputs"]:
                node["inputs"]["seed"] = seed
            if "noise_seed" in node["inputs"]:
                node["inputs"]["noise_seed"] = seed

def patch_frames(wf, fps, dur):
    for nid, node in wf.items():
        ct = node.get("class_type", "")
        if ct in ("EmptyHunyuanLatentVideo", "EmptyLatentVideo", "WanLatentVideo"):
            if "length" in node["inputs"]:
                node["inputs"]["length"] = int(fps * dur)
            if "fps" in node["inputs"]:
                node["inputs"]["fps"] = fps

def submit_and_wait(workflow, timeout_s=900):
    j = comfy_post("/prompt", {"prompt": workflow, "client_id": CLIENT_ID})
    pid = j["prompt_id"]
    t0 = time.time()
    while True:
        h = comfy_get(f"/history/{pid}")
        if pid in h and h[pid].get("status", {}).get("completed"):
            return h[pid]
        if time.time() - t0 > timeout_s:
            sys.exit(f"timeout esperando prompt {pid}")
        time.sleep(3)

def collect_outputs(history, expect_ext):
    out = []
    for nid, data in history.get("outputs", {}).items():
        for key in ("videos", "images", "gifs"):
            for f in data.get(key, []) or []:
                if f["filename"].endswith(expect_ext):
                    out.append(f)
    return out

# ------------------------------------------------------------------ generation per format
def build_prompt(beat, defaults):
    style  = beat.get("style", defaults.get("style", "editorial"))
    cam    = beat.get("camera", "static")
    return (beat["prompt"].strip() + STYLE_SUFFIX.get(style, "") + CAMERA_SUFFIX.get(cam, "") + ", vertical 9:16").strip()

def resolve_seed(beat):
    s = beat.get("seed", "random")
    return random.randint(1, 2**31 - 1) if s == "random" else int(s)

def gen_cinematic(beat, defaults, out_path):
    wf = load_workflow("cinematic_wan22")
    patch_text_encoders(wf, build_prompt(beat, defaults), NEGATIVE)
    patch_seed(wf, resolve_seed(beat))
    patch_frames(wf, defaults.get("fps", 24), beat["duration"])
    h = submit_and_wait(wf)
    files = collect_outputs(h, ".mp4")
    if not files:
        sys.exit(f"{beat['id']}: ComfyUI no devolvio video")
    comfy_download(files[0]["filename"], files[0].get("subfolder", ""), files[0].get("type", "output"), out_path)

def gen_image(prompt, seed, out_path, workflow="image_flux_dev"):
    wf = load_workflow(workflow)
    patch_text_encoders(wf, prompt, NEGATIVE)
    patch_seed(wf, seed)
    h = submit_and_wait(wf)
    files = collect_outputs(h, ".png")
    if not files:
        sys.exit(f"img seed {seed}: ComfyUI no devolvio imagen")
    comfy_download(files[0]["filename"], files[0].get("subfolder", ""), files[0].get("type", "output"), out_path)

def gen_text_card(beat, defaults, out_path):
    bg = beat["background"]
    bg_prompt = build_prompt({**beat, "prompt": bg["prompt"], "style": bg.get("style", defaults["style"]), "camera": "static"}, defaults)
    bg_png = out_path.replace(".mp4", "_bg.png")
    gen_image(bg_prompt, int(bg.get("seed", 0) or random.randint(1, 2**31-1)), bg_png)
    # overlay con drawtext (DM Serif headline + Space Grotesk subhead/kicker + brand sig "marli")
    apply_text_card_overlay(bg_png, beat, defaults, out_path)

def gen_ugc(beat, defaults, out_path):
    wf = load_workflow("ugc_wan22")
    patch_text_encoders(wf, build_prompt(beat, defaults), NEGATIVE)
    patch_seed(wf, resolve_seed(beat))
    patch_frames(wf, defaults.get("fps", 24), beat["duration"])
    h = submit_and_wait(wf)
    files = collect_outputs(h, ".mp4")
    if not files:
        sys.exit(f"{beat['id']}: UGC no devolvio video")
    video_only = out_path.replace(".mp4", "_silent.mp4")
    comfy_download(files[0]["filename"], files[0].get("subfolder", ""), files[0].get("type", "output"), video_only)
    # voz: TTS via ElevenLabs si esta configurado
    voice_wav = synthesize_voice(beat) if beat.get("audio", {}).get("source") == "tts" else None
    mux_ugc(video_only, voice_wav, beat.get("subtitle"), defaults, out_path)

def gen_slideshow5(beat, defaults, out_path):
    duration = beat["duration"]
    slide_dur = beat.get("slide_dur", 1.0)
    n = max(1, int(round(duration / slide_dur)))
    base_seed = int(beat.get("seed_base", 0) or random.randint(1, 2**31-1))
    pngs = []
    for i, slide in enumerate(beat["slides"][:n]):
        png = out_path.replace(".mp4", f"_slide{i+1}.png")
        gen_image(build_prompt({**beat, "prompt": slide["prompt"], "camera": "static"}, defaults), base_seed + i, png)
        pngs.append((png, slide.get("overlay", "")))
    assemble_slideshow(pngs, slide_dur, beat.get("transition", "hard-cut"), beat.get("sting", "none"), defaults, out_path)

# ------------------------------------------------------------------ post-text overlays
def ff(args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True, stdin=subprocess.DEVNULL)

def drawtext(text, font, fs, color, x, y, t_in=0.0):
    color = str(color).replace("white", "0xFFFFFF").replace("red", "0xE24B4A").replace("ink", "0x2C2C2C").replace("grey", "0x6B6B6B")
    return (f"drawtext=fontfile={font}:text='{text}':fontsize={fs}:fontcolor={color}:"
            f"alpha='clip((t-{t_in})/0.4\\,0\\,1)':x={x}:y='{y}+45*(1-clip((t-{t_in})/0.4\\,0\\,1))'")

def apply_text_card_overlay(bg_png, beat, defaults, out_path):
    headline = drawtext(beat["headline"], defaults["fonts"]["headline"], 150, defaults["brand"]["red"], "(w-text_w)/2", 680, 0.4)
    subhead  = drawtext(beat["subhead"],  defaults["fonts"]["body"],     54,  defaults["brand"]["ink"], "(w-text_w)/2", 920, 1.0)
    kicker   = drawtext(beat.get("kicker", ""), defaults["fonts"]["body"], 44, defaults["brand"]["grey"], "(w-text_w)/2", 540, 0.1) if beat.get("kicker") else ""
    sig      = drawtext("marli", defaults["fonts"]["headline"], 52, defaults["brand"]["red"], "(w-text_w)/2", 1760, 0.2)
    chain = ",".join(x for x in [kicker, headline, subhead, sig] if x)
    if beat.get("cta_pill"):
        pill_y = 1050
        pill = (f"drawbox=x=(iw-780)/2:y={pill_y}:w=780:h=112:color={defaults['brand']['red']}:t=fill:enable='gte(t,1.5)',"
                f"drawtext=fontfile={defaults['fonts']['body']}:text='{beat['cta_pill']}':fontsize=42:fontcolor=white:"
                f"x=(w-text_w)/2:y={pill_y}+34:enable='gte(t,1.5)'")
        url = drawtext(beat.get("cta_url",""), defaults["fonts"]["body"], 46, defaults["brand"]["ink"], "(w-text_w)/2", 1230, 2.0)
        chain = ",".join([chain, pill, url])
    if beat.get("fade_out"):
        chain += f",fade=t=out:st={beat['duration']-beat['fade_out']}:d={beat['fade_out']}"
    ff(["-loop", "1", "-t", str(beat["duration"]), "-i", bg_png,
        "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,{chain},format=yuv420p",
        "-r", "30", "-t", str(beat["duration"]), "-c:v", "libx264", "-crf", "16", "-preset", "fast", out_path])

def assemble_slideshow(pngs, slide_dur, transition, sting, defaults, out_path):
    parts = []
    for i, (png, overlay) in enumerate(pngs):
        seg = out_path.replace(".mp4", f"_seg{i+1}.mp4")
        chain = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
        if overlay:
            chain += "," + drawtext(overlay, defaults["fonts"]["headline"], 80, defaults["brand"]["red"], "(w-text_w)/2", 1500, 0.05)
        ff(["-loop", "1", "-t", str(slide_dur), "-i", png,
            "-vf", f"{chain},format=yuv420p", "-r", "30", "-t", str(slide_dur),
            "-c:v", "libx264", "-crf", "16", "-preset", "fast", seg])
        parts.append(seg)
    list_txt = out_path.replace(".mp4", "_concat.txt")
    with open(list_txt, "w") as f:
        for p in parts: f.write(f"file '{os.path.basename(p)}'\n")
    ff(["-f", "concat", "-safe", "0", "-i", list_txt, "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", out_path])

# ------------------------------------------------------------------ UGC voice / mux
def synthesize_voice(beat):
    audio = beat["audio"]
    key = os.environ.get("ELEVENLABS_KEY")
    if not key:
        sys.exit("UGC con tts: falta ELEVENLABS_KEY en env")
    out = f"/tmp/ugc_voice_{uuid.uuid4().hex}.wav"
    body = {"text": audio["text"], "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.25, "similarity_boost": 0.85, "style": 0.6, "use_speaker_boost": True}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{audio['voice_id']}",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/wav"})
    with urllib.request.urlopen(req, timeout=60) as r, open(out, "wb") as f:
        f.write(r.read())
    return out

def mux_ugc(video_silent, voice_wav, subtitle, defaults, out_path):
    inputs = ["-i", video_silent]
    if voice_wav:
        inputs += ["-i", voice_wav]
    sub_filter = ""
    if subtitle:
        sub_filter = (f",drawbox=x=(iw-720)/2:y=1640:w=720:h=84:color=black@0.55:t=fill,"
                      f"drawtext=fontfile={defaults['fonts']['body']}:text='{subtitle}':fontsize=40:fontcolor=white:"
                      f"x=(w-text_w)/2:y=1664")
    vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920{sub_filter},format=yuv420p"
    if voice_wav:
        ff([*inputs, "-vf", vf, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "16",
            "-c:a", "aac", "-b:a", "192k", out_path])
    else:
        ff([*inputs, "-vf", vf, "-an", "-c:v", "libx264", "-crf", "16", out_path])

# ------------------------------------------------------------------ final assembly
def beat_with_audio(in_clip, music_start, dur, mix, music_path, out, sting=False):
    if mix["voice"] > 0:
        fc = (f"[0:v]copy[v];[0:a]volume={mix['voice']}[va];"
              f"[1:a]atrim={music_start}:{music_start+dur},asetpts=PTS-STARTPTS,volume={mix['music']}[vm];"
              f"[va][vm]amix=inputs=2:duration=first[a]")
        ff(["-t", str(dur), "-i", in_clip, "-i", music_path, "-filter_complex", fc,
            "-map", "[v]", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", out])
    else:
        fc = f"[1:a]atrim={music_start}:{music_start+dur},asetpts=PTS-STARTPTS,volume={mix['music']}[a]"
        ff(["-t", str(dur), "-i", in_clip, "-i", music_path, "-filter_complex", fc,
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", out])

def assemble_final(cfg, beats_files):
    music = cfg["ad"]["music"]
    mix = cfg["audio_mix"]
    out_dir = f"outputs/{cfg['ad']['name']}"
    parts = []
    cursor = 0
    for i, (b, f) in enumerate(zip(cfg["beats"], beats_files), 1):
        m = mix[b["type"].lower()]
        beat_out = f"{out_dir}/_beat{i}.mp4"
        beat_with_audio(f, cursor, b["duration"], m, music, beat_out)
        parts.append(beat_out)
        cursor += b["duration"]
    list_txt = f"{out_dir}/_concat.txt"
    with open(list_txt, "w") as fh:
        for p in parts: fh.write(f"file '{os.path.basename(p)}'\n")
    final = f"outputs/{cfg['ad']['name']}.mp4"
    ff(["-f", "concat", "-safe", "0", "-i", list_txt,
        "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
    print(f"LISTO -> {final}")

# ------------------------------------------------------------------ main
GEN = {"CINEMATIC": gen_cinematic, "UGC": gen_ugc, "TEXT_CARD": gen_text_card, "SLIDESHOW_5": gen_slideshow5}

def main():
    if len(sys.argv) != 2:
        sys.exit("uso: python3 comfy_generate.py configs/<ad>.yaml")
    with open(sys.argv[1]) as f:
        cfg = yaml.safe_load(f)
    out_dir = f"outputs/{cfg['ad']['name']}"
    os.makedirs(out_dir, exist_ok=True)
    defaults = {**cfg.get("defaults", {}),
                "fonts": cfg["ad"]["fonts"], "brand": cfg["ad"]["brand"]}
    beats_files = []
    for i, beat in enumerate(cfg["beats"], 1):
        kind = beat["type"]
        out = f"{out_dir}/beat{i}_{kind.lower()}_{beat['id']}.mp4"
        print(f"[{i}/{len(cfg['beats'])}] {kind} -> {beat['id']} ({beat['duration']}s, style={beat.get('style', defaults.get('style'))}, seed={beat.get('seed','random')})", flush=True)
        GEN[kind](beat, defaults, out)
        beats_files.append(out)
    assemble_final(cfg, beats_files)

if __name__ == "__main__":
    main()
