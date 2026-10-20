/**
 * Springs solved at run time. The CSS springs are sampled at build time
 * into linear() easings that always start from rest, so motion that is
 * interrupted restarts. A spring solved here starts from where something
 * is, at the speed it has, as M3's springs do: mass 1, a damping ratio and
 * a stiffness.
 */
export interface Spring {
  damping: number;
  stiffness: number;
}

/** Frames per second the path is sampled at. */
const FPS = 60;
/** Settled once within this distance of the target and moving less than this a frame. */
const REST = 0.5;
/** No spring runs longer than this, in seconds. */
const LONGEST = 5;

/**
 * How far from the target a spring is at `t` seconds, released `x0` away
 * at speed `v0`: underdamped springs oscillate as they decay, and M3's
 * critically damped ones do not.
 */
function displacement(x0: number, v0: number, { damping, stiffness }: Spring, t: number) {
  const w = Math.sqrt(stiffness);
  if (damping >= 1) return Math.exp(-w * t) * (x0 + (v0 + w * x0) * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return Math.exp(-damping * w * t) * (x0 * Math.cos(wd * t) + ((v0 + damping * w * x0) / wd) * Math.sin(wd * t));
}

/**
 * The spring's path from `from` to `to`, released at `velocity` in units
 * per millisecond, as one value a frame until it settles on `to`.
 */
export function springPath(from: number, to: number, velocity: number, spring: Spring): number[] {
  const path = [from];
  const [x0, v0] = [from - to, velocity * 1000];
  for (let frame = 1; frame < LONGEST * FPS; frame++) {
    const x = displacement(x0, v0, spring, frame / FPS);
    path.push(to + x);
    if (Math.abs(x) < REST && Math.abs(to + x - path[frame - 1]) < REST) break;
  }
  path.push(to);
  return path;
}

/** The spring a CSS token names, from its -damping and -stiffness tokens, or null without them. */
export function springToken(el: Element, name: string): Spring | null {
  const style = getComputedStyle(el);
  const read = (part: string) => parseFloat(style.getPropertyValue(`--md-sys-motion-spring-${name}-${part}`));
  const [damping, stiffness] = [read('damping'), read('stiffness')];
  return damping > 0 && stiffness > 0 ? { damping, stiffness } : null;
}

/** Plays a path on one property, `write` turning each value into CSS. */
export function animatePath(el: Element, property: string, path: number[], write: (value: number) => string): Animation {
  const frames = path.map((value) => ({ [property]: write(value) }));
  return el.animate(frames, { duration: ((path.length - 1) * 1000) / FPS, easing: 'linear' });
}
