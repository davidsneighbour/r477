# r477

Scriptable generative video art. Version 0.1 generates **uniform full-frame RGB colour transitions** as MP4 files. A clip can change between two colours or travel through multiple stops. Rendering is separated from export so future versions can add gradients, moving shades, shaders and glitches.

## Requirements

- Node.js 24 or newer
- FFmpeg with the libx264 encoder (`sudo apt install ffmpeg` on Ubuntu/Xubuntu)

## Getting started

```bash
npm install
npm run generate -- --config examples/clips.json --output output
```

The example creates three videos in `output/`. Files with the same names are overwritten.

To run tests and TypeScript checking:

```bash
npm test
npm run typecheck
```

To see the CLI options: `npm run generate -- --help`.

## Configuration

```json
{
  "defaults": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 5,
    "easing": "linear"
  },
  "clips": [
    {
      "name": "red-to-blue",
      "from": "#ff0000",
      "to": "#0000ff"
    },
    {
      "name": "rgb-loop",
      "colours": [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ff0000"
      ],
      "duration": 12,
      "easing": "ease-in-out"
    }
  ]
}
```

- `width` and `height`: even pixel dimensions, 2–8192; default 1920×1080.
- `fps`: integer frames per second, 1–120; default 30.
- `duration`: seconds per clip, 0.1–3600; default 5. Actual output duration is rounded to a whole frame.
- `easing`: `linear` or `ease-in-out`; default linear. Easing applies per transition segment.
- `from`/`to`: two hexadecimal RGB colours, or use `colours` with two or more colour stops.
- `name`: unique filename stem using letters, digits, underscores and hyphens.

Interpolation is performed independently in the three **sRGB channel values**, not HSL or OKLCH. Each frame is one flat colour, not a spatial gradient. The first and last frames match the first and last stops; for a looping clip, repeat the first colour as the final stop.

## Encoding and colour accuracy

FFmpeg receives one raw RGB pixel per frame and nearest-neighbour scales it to the target size. It then encodes H.264 MP4 using YUV 4:2:0 for compatibility. RGB-to-YUV conversion and lossy encoding may alter exact pixel values slightly. This is a viewing format, **not a colour-accurate master**.

No audio is generated. FFmpeg must be available on `PATH`. Errors from the generator and FFmpeg cause a non-zero exit status.

## Planned extensions

1. Other interpolation spaces (HSL, OKLCH).
2. Timing controls: holds, per-stop durations, seeded random sequences.
3. Alternative encoders and lossless masters.
4. Spatial renderers: gradients, noise, glitched frames and GPU shaders.

The first version deliberately does not introduce a graphical UI or an elaborate rendering framework.
