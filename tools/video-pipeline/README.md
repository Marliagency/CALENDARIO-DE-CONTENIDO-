# Pipeline de producción en masa de video (RunPod + ComfyUI)

Pipeline para: das un brief -> Claude Code expande el lote de prompts -> enciende
una GPU en RunPod -> ComfyUI genera los videos -> se descargan a `./outputs/` ->
apaga la GPU. Coste objetivo: solo los minutos de GPU encendida (~$0.34-0.39/h en
una RTX 4090).

> IMPORTANTE: este pipeline corre desde **Claude Code en tu Mac**, no desde el
> entorno web/cloud de Claude Code. Necesita el MCP de RunPod, la variable
> `$RUNPOD_API_KEY` y la red al pod, que no existen en el contenedor cloud.

## Archivos

- `comfy_batch.py` — script puente: envía cada prompt a la API de ComfyUI,
  espera por WebSocket y descarga los videos.
- `CLAUDE.md` — reglas de orquestación que Claude Code lee para encender/apagar
  el pod, expandir el brief y controlar el coste. Aplica solo a esta carpeta.

## Requisitos previos (una sola vez)

1. Node.js 18+ (para el MCP de RunPod): `node --version`.
2. Python 3.9+ (para el script puente): `python3 --version`.
3. Cuenta en RunPod con saldo + una API Key (Settings -> API Keys).
4. Claude Code instalado en la Mac.

### 1. Guardar la API key de RunPod

```bash
echo 'export RUNPOD_API_KEY="pega_tu_key_aqui"' >> ~/.zshrc
source ~/.zshrc
echo $RUNPOD_API_KEY   # debe mostrar tu key
```

### 2. Conectar el MCP de RunPod a Claude Code

```bash
claude mcp add runpod -s user \
  -e RUNPOD_API_KEY=$RUNPOD_API_KEY \
  -- npx -y @runpod/mcp-server@latest

claude mcp list   # debe aparecer "runpod"
```

En una sesión activa, `/mcp` reconecta sin reiniciar.

### 3. Network Volume (almacenamiento persistente)

Sin esto, cada apagado pierde los modelos WAN (varios GB). Crea un Network Volume
de ~100GB en el datacenter más barato (Storage -> Network Volumes -> New Volume).
Anota el `VOLUME_ID`. Coste ~$0.05-0.10/GB/mes.

### 4. Primer arranque con la plantilla WAN (una vez)

Plantilla recomendada: "One Click ComfyUI - Wan 2.1 / Wan 2.2 (CUDA 12.8)" de
HearmemanAI (RunPod Hub). La primera vez descarga ComfyUI + modelos al network
volume; hazlo con una GPU barata (RTX 3090) para no pagar de más. Expón los
puertos 8188 (ComfyUI) y 8888 (Jupyter, si aplica). Confirma que ComfyUI carga
en la URL del puerto 8188 y luego `stop` el pod.

### 5. Dependencias del script puente

```bash
pip3 install requests websocket-client
```

### 6. Exportar tu workflow WAN (una vez)

ComfyUI no genera desde texto plano: necesita un "workflow" (grafo de nodos) en
formato API. Exporta tu workflow WAN desde la UI de ComfyUI (guardar/exportar en
formato API) y guárdalo como `wan_workflow.json` junto a este script. El script
localiza el nodo de prompt positivo y le inyecta cada prompt del lote; ajusta
`find_positive_prompt_node()` si tu workflow usa otra estructura.

## Uso en producción

En cada sesión de producción, desde la carpeta del proyecto en tu Mac:

```
Lee tools/video-pipeline/CLAUDE.md. Quiero 40 variaciones sobre este brief:
"[tu brief aquí]". Estilo cinematográfico, 9:16, 5 segundos cada uno.
Encárgate de todo: enciende el pod, genera el lote y devuélveme los videos.
```

Claude Code: expande el brief a `batch_prompts.json`, arranca el pod (`start`),
espera a ComfyUI, ejecuta el script, descarga los `.mp4` a `./outputs/`, apaga el
pod (`stop`) y entrega el reporte (nº de videos, tiempo, coste estimado).

Formato de los prompts: ver `batch_prompts.example.json` (3 prompts de muestra).
Cópialo a `batch_prompts.json` para un lote manual, o deja que Claude Code lo
genere desde tu brief. Cada item: `id`, `prompt`, `duracion`, `formato`.

Invocación manual del script:

```bash
python3 comfy_batch.py \
  --comfy-url https://XXXX-8188.proxy.runpod.net \
  --prompts ./batch_prompts.json \
  --out ./outputs \
  --workflow ./wan_workflow.json
```

## Control de coste (crítico)

- El pod cobra por minuto ENCENDIDO, no por video. Nunca dejes un pod "running"
  sin generar.
- El `CLAUDE.md` obliga a apagar el pod al terminar el lote y a avisar si detecta
  un pod encendido ocioso.
- Pon un spending limit en RunPod (Settings -> Billing).
- Revisa que no queden pods "running" al final del día.

## Límites de resolución

- RTX 4090 (24GB): modelos WAN 14B a 480p, o TI2V-5B a 720p.
- 720p estable en modelos grandes requiere A100/H100 (más caros).
- Para redes (9:16 vertical) 480-720p suele bastar; upscaling después si hace
  falta.
