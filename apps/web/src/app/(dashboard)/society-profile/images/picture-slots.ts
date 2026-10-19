import { PROFILE_IMAGE_SLOTS_COUNT } from './slot-count';

/** The six slots as the API keeps them (null = empty), with one slot set or cleared. */
export function withSlot(images: ReadonlyArray<string | null>, index: number, url: string | null): Array<string | null> {
  const slots = Array.from({ length: PROFILE_IMAGE_SLOTS_COUNT }, (_, i) => images[i] ?? null);
  slots[index] = url;
  // Trailing empty slots are not sent.
  let end = slots.length;
  while (end > 0 && slots[end - 1] === null) end -= 1;
  return slots.slice(0, end);
}
