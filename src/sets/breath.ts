// Shared "pumped up like a balloon" cycle (Short #3): the cabin wall and Milo's
// balloon swell and relax together. 0 = relaxed, 1 = fully pumped.
export const BREATH_PERIOD = 2.4;
export const breath = (t: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / BREATH_PERIOD);
