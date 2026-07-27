/* Self-check for arrangeIcons — run with `npx tsx src/utils/desktop.test.ts`.
 * No framework: the packing is the only non-trivial bit and it either holds or
 * it does not. */
import assert from 'node:assert/strict';

// arrangeIcons reads window for the usable height; give it a desktop-sized one.
(globalThis as unknown as { window: unknown }).window = {
  innerHeight: 800,
  innerWidth: 1400,
};
(globalThis as unknown as { document: unknown }).document = {
  documentElement: {},
};
(globalThis as unknown as { getComputedStyle: unknown }).getComputedStyle = () => ({
  getPropertyValue: () => '1',
});

const { arrangeIcons, GRID_SIZE, MIN_X, MIN_Y } = await import('./desktop.ts');

const icon = (id: string, x: number, y: number) => ({ id, position: { x, y } });

// 800 - 28 menubar - 80 dock = 692 usable; (692 - 20) / 90 = 7 rows
const scattered = [
  icon('d', 300, 500),
  icon('a', 21, 19),
  icon('c', 205, 33),
  icon('b', 24, 400),
];
const tidy = arrangeIcons(scattered);

// every icon lands on the grid
for (const i of tidy) {
  assert.equal((i.position.x - MIN_X) % GRID_SIZE, 0, `${i.id} off-grid in x`);
  assert.equal((i.position.y - MIN_Y) % GRID_SIZE, 0, `${i.id} off-grid in y`);
}

// no two icons share a cell
const cells = tidy.map((i) => `${i.position.x},${i.position.y}`);
assert.equal(new Set(cells).size, cells.length, 'icons overlap after arranging');

// reading order is preserved: left-to-right, then top-to-bottom
assert.deepEqual(tidy.map((i) => i.id), ['a', 'b', 'c', 'd']);

// and it packs down the first column before starting the next
assert.deepEqual(tidy[0].position, { x: MIN_X, y: MIN_Y });
assert.deepEqual(tidy[1].position, { x: MIN_X, y: MIN_Y + GRID_SIZE });

// nothing is lost
assert.equal(tidy.length, scattered.length);

// a short desktop forces a new column sooner
(globalThis as unknown as { window: { innerHeight: number } }).window.innerHeight = 300;
const cramped = arrangeIcons([icon('a', 0, 0), icon('b', 1, 0), icon('c', 2, 0)]);
assert.equal(cramped[0].position.x, MIN_X);
assert.equal(cramped[1].position.x, MIN_X + GRID_SIZE, 'should wrap to a new column');

console.log('arrangeIcons: all checks passed');
