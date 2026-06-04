export interface TreemapItem<T> {
  id: string;
  value: number;
  data: T;
}

export interface TreemapRect<T> {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TreemapItem<T>;
}

// Squarified Treemap Algorithm (Bruls, Huizing, van Wijk)
function worst(row: number[], w: number): number {
  if (row.length === 0) return Infinity;
  const s = row.reduce((a, b) => a + b, 0);
  const s2 = s * s;
  const w2 = w * w;
  let max = -Infinity;
  let min = Infinity;
  for (const v of row) {
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

export function computeSquarifiedTreemap<T>(
  items: TreemapItem<T>[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect<T>[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];

  // Sort items descending by value
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const totalValue = sorted.reduce((acc, it) => acc + Math.max(1, it.value), 0);
  const totalArea = w * h;

  // Normalized areas
  const normalized = sorted.map(item => ({
    item,
    area: (Math.max(1, item.value) / totalValue) * totalArea,
  }));

  const results: TreemapRect<T>[] = [];
  let curX = x;
  let curY = y;
  let curW = w;
  let curH = h;

  let remaining = [...normalized];

  while (remaining.length > 0) {
    const side = Math.min(curW, curH);
    const row: typeof remaining = [];
    const rowAreas: number[] = [];

    row.push(remaining[0]);
    rowAreas.push(remaining[0].area);
    let curWorst = worst(rowAreas, side);

    let idx = 1;
    while (idx < remaining.length) {
      const nextArea = remaining[idx].area;
      const testAreas = [...rowAreas, nextArea];
      const testWorst = worst(testAreas, side);

      if (testWorst <= curWorst) {
        row.push(remaining[idx]);
        rowAreas.push(nextArea);
        curWorst = testWorst;
        idx++;
      } else {
        break;
      }
    }

    // Layout the row
    const rowAreaSum = rowAreas.reduce((a, b) => a + b, 0);
    const isHorizontal = curW < curH;

    if (isHorizontal) {
      // Row spans full width curW, height is rowAreaSum / curW
      const rowHeight = rowAreaSum / curW;
      let itemX = curX;
      for (const r of row) {
        const itemWidth = r.area / rowHeight;
        results.push({
          x: itemX,
          y: curY,
          w: itemWidth,
          h: rowHeight,
          item: r.item,
        });
        itemX += itemWidth;
      }
      curY += rowHeight;
      curH -= rowHeight;
    } else {
      // Row spans full height curH, width is rowAreaSum / curH
      const rowWidth = rowAreaSum / curH;
      let itemY = curY;
      for (const r of row) {
        const itemHeight = r.area / rowWidth;
        results.push({
          x: curX,
          y: itemY,
          w: rowWidth,
          h: itemHeight,
          item: r.item,
        });
        itemY += itemHeight;
      }
      curX += rowWidth;
      curW -= rowWidth;
    }

    remaining = remaining.slice(row.length);
  }

  return results;
}
