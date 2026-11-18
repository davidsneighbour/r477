export type Easing = "linear" | "ease-in-out";
export type RGB = readonly [number, number, number];

export interface Clip {
  name: string;
  colours: string[];
  duration: number;
  easing: Easing;
}

export interface Settings {
  width: number;
  height: number;
  fps: number;
  clips: Clip[];
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(where + " must be an object");
  }
  return value as Record<string, unknown>;
}

function number(value: unknown, fallback: number, where: string, min: number, max: number, integer = false): number {
  const result = value === undefined ? fallback : value;
  if (typeof result !== "number" || !Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) {
    throw new Error(where + " must be " + (integer ? "an integer" : "a number") + " between " + min + " and " + max);
  }
  return result;
}

function colour(value: unknown, where: string): string {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(where + " must be a six-digit RGB hex colour (#RRGGBB)");
  }
  return value.toLowerCase();
}

function easing(value: unknown, where: string): Easing {
  if (value === undefined || value === "linear") return "linear";
  if (value === "ease-in-out") return value;
  throw new Error(where + ' must be "linear" or "ease-in-out"');
}

export function validateConfig(value: unknown): Settings {
  const config = object(value, "config");
  const defaults = config.defaults === undefined ? {} : object(config.defaults, "defaults");
  const width = number(defaults.width, 1920, "defaults.width", 2, 8192, true);
  const height = number(defaults.height, 1080, "defaults.height", 2, 8192, true);
  const fps = number(defaults.fps, 30, "defaults.fps", 1, 120, true);
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error("width and height must be even for yuv420p MP4 output");
  }
  const defaultDuration = number(defaults.duration, 5, "defaults.duration", 0.1, 3600);
  const defaultEasing = easing(defaults.easing, "defaults.easing");
  if (!Array.isArray(config.clips) || config.clips.length === 0) {
    throw new Error("clips must be a non-empty array");
  }
  const seen = new Set<string>();
  const clips: Clip[] = config.clips.map((item: unknown, index: number) => {
    const where = "clips[" + index + "]";
    const clip = object(item, where);
    if (typeof clip.name !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(clip.name)) {
      throw new Error(where + ".name must use only letters, digits, hyphens or underscores");
    }
    if (seen.has(clip.name)) throw new Error("duplicate clip name: " + clip.name);
    seen.add(clip.name);
    let colours: string[];
    if (clip.colours !== undefined) {
      if (clip.from !== undefined || clip.to !== undefined) {
        throw new Error(where + ": use either colours or from/to, not both");
      }
      if (!Array.isArray(clip.colours) || clip.colours.length < 2) {
        throw new Error(where + ".colours must contain at least two colours");
      }
      colours = clip.colours.map((c: unknown, i: number) => colour(c, where + ".colours[" + i + "]"));
    } else {
      colours = [colour(clip.from, where + ".from"), colour(clip.to, where + ".to")];
    }
    return {
      name: clip.name,
      colours,
      duration: number(clip.duration, defaultDuration, where + ".duration", 0.1, 3600),
      easing: easing(clip.easing === undefined ? defaultEasing : clip.easing, where + ".easing"),
    };
  });
  return { width, height, fps, clips };
}

export function parseRGB(hex: string): RGB {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error("invalid RGB colour: " + hex);
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function colourAt(clip: Clip, progress: number): RGB {
  const t = Math.min(1, Math.max(0, progress));
  const segmentPosition = t * (clip.colours.length - 1);
  const index = Math.min(clip.colours.length - 2, Math.floor(segmentPosition));
  let local = segmentPosition - index;
  if (clip.easing === "ease-in-out") local = local * local * (3 - 2 * local);
  const from = parseRGB(clip.colours[index]!);
  const to = parseRGB(clip.colours[index + 1]!);
  return [
    Math.round(from[0] + (to[0] - from[0]) * local),
    Math.round(from[1] + (to[1] - from[1]) * local),
    Math.round(from[2] + (to[2] - from[2]) * local),
  ];
}

/**
 * One RGB pixel per frame. FFmpeg scales it to the requested dimensions.
 * The renderer can later be replaced without changing batch configuration.
 */
export function renderFrames(clip: Clip, fps: number): Buffer {
  const count = Math.max(2, Math.round(clip.duration * fps));
  const bytes = Buffer.allocUnsafe(count * 3);
  for (let i = 0; i < count; i++) {
    const rgb = colourAt(clip, i / (count - 1));
    bytes[i * 3] = rgb[0];
    bytes[i * 3 + 1] = rgb[1];
    bytes[i * 3 + 2] = rgb[2];
  }
  return bytes;
}
