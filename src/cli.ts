#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { renderFrames, validateConfig } from "./core.ts";

function usage(): string {
  return [
    "r477 — generate uniform RGB transition videos",
    "",
    "Usage: node src/cli.ts --config <file> [--output <directory>]",
    "",
    "Options:",
    "  --config   JSON configuration file (default: examples/clips.json)",
    "  --output   Output directory (default: output)",
    "  --help     Show this help",
  ].join("\n");
}

function args(argv: string[]): { config: string; output: string; help: boolean } {
  let config = "examples/clips.json";
  let output = "output";
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    if (option === "--help") { help = true; continue; }
    if (option === "--config" || option === "--output") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("missing value for " + option);
      if (option === "--config") config = value;
      else output = value;
      continue;
    }
    throw new Error("unknown option: " + option + " (use --help)");
  }
  return { config, output, help };
}

function main(): void {
  const options = args(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  let json: unknown;
  const configFile = resolve(options.config);
  try {
    json = JSON.parse(readFileSync(configFile, "utf8")) as unknown;
  } catch (error) {
    throw new Error("cannot read configuration " + configFile + ": " + String(error), { cause: error });
  }
  const settings = validateConfig(json);
  const directory = resolve(options.output);
  mkdirSync(directory, { recursive: true });
  for (const clip of settings.clips) {
    const target = join(directory, clip.name + ".mp4");
    const frames = renderFrames(clip, settings.fps);
    const command = [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "rawvideo", "-pixel_format", "rgb24",
      "-video_size", "1x1", "-framerate", String(settings.fps),
      "-i", "pipe:0",
      "-vf", "scale=" + settings.width + ":" + settings.height + ":flags=neighbor,format=yuv420p",
      "-frames:v", String(frames.length / 3),
      "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
      "-movflags", "+faststart", target,
    ];
    console.log("Rendering " + clip.name + " (" + clip.duration + "s, " + settings.width + "x" + settings.height + ")");
    const result = spawnSync("ffmpeg", command, {
      input: frames,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
      rmSync(target, { force: true });
      const reason = result.error?.message ?? result.stderr?.trim() ?? "unknown error";
      throw new Error("FFmpeg failed for " + clip.name + ": " + reason + " (exit " + result.status + ")", { cause: result.error });
    }
    console.log("Created " + target);
  }
}

try {
  main();
} catch (error) {
  console.error("r477:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
