export type Gray = { width: number; height: number; data: Uint8Array };

/** ÖSYM's watermark is orange (high red, low blue) while text is black, so the red channel alone drops it. */
export function redChannel(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Gray {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 1) data[i] = rgba[i * 4];
  return { width, height, data };
}

export type Gutter = { x: number; method: "rule" | "valley"; left: number; right: number };

/**
 * Finds the vertical rule between the two columns, or the emptiest band near the middle when there is none.
 * The rule is light grey, so it is found by its unbroken vertical run rather than by darkness: glyph strokes never run that long.
 */
export function findGutter(image: Gray, ruleBelow = 192, textBelow = 128): Gutter {
  const from = Math.floor(image.width * 0.4);
  const to = Math.ceil(image.width * 0.6);
  const runs: number[] = [];
  const counts: number[] = [];
  for (let x = from; x < to; x += 1) {
    let run = 0;
    let best = 0;
    let dark = 0;
    for (let y = 0; y < image.height; y += 1) {
      const value = image.data[y * image.width + x];
      run = value < ruleBelow ? run + 1 : 0;
      if (run > best) best = run;
      if (value < textBelow) dark += 1;
    }
    runs.push(best);
    counts.push(dark);
  }
  const rule = runs.map((run, index) => (run > image.height * 0.5 ? index : -1)).filter((index) => index >= 0);
  if (rule.length) {
    const left = from + rule[0];
    const right = from + rule[rule.length - 1];
    return { x: Math.round((left + right) / 2), method: "rule", left, right };
  }
  const min = Math.min(...counts);
  const band = counts.map((count, index) => (count === min ? index : -1)).filter((index) => index >= 0);
  const x = from + band[Math.floor(band.length / 2)];
  return { x, method: "valley", left: x, right: x };
}

export function crop(image: Gray, left: number, top: number, width: number, height: number): Gray {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) data.set(image.data.subarray((top + y) * image.width + left, (top + y) * image.width + left + width), y * width);
  return { width, height, data };
}

export function toRgba(image: Gray): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.data.length; i += 1) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = image.data[i];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** Splits a two-column page at the gutter, leaving a small margin so the rule itself is not read as text. */
export function splitColumns(image: Gray, margin = 6): { left: Gray; right: Gray; gutter: Gutter } {
  const gutter = findGutter(image);
  const leftWidth = Math.max(1, gutter.left - margin);
  const rightStart = Math.min(image.width - 1, gutter.right + margin);
  return {
    left: crop(image, 0, 0, leftWidth, image.height),
    right: crop(image, rightStart, 0, image.width - rightStart, image.height),
    gutter,
  };
}
