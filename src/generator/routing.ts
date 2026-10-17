import type { Cell, RoadStyle } from '../model/document';
import { cellKey, neighbors } from './navigation';
import { GenerationError } from './settings';
interface Node { cell: Cell; cost: number; priority: number; direction: number; order: number }
class Queue {
  private nodes: Node[] = [];
  get size() { return this.nodes.length; }
  push(node: Node) {
    const a = this.nodes; a.push(node); let i = a.length - 1;
    while (i) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop(): Node {
    const a = this.nodes, top = a[0], last = a.pop()!;
    if (a.length) { a[0] = last; let i = 0; while (true) { let c = i * 2 + 1; if (c >= a.length) break; if (c + 1 < a.length && this.less(a[c + 1], a[c])) c++; if (!this.less(a[c], a[i])) break; [a[c], a[i]] = [a[i], a[c]]; i = c; } }
    return top;
  }
  private less(a: Node, b: Node) { return a.priority < b.priority || (a.priority === b.priority && a.order < b.order); }
}
/** Logical four-neighbour navigation. Visual rounding is never used for reachability. */
export function route(start: Cell, destination: Cell, land: Set<string>, blocked: Set<string>, style: RoadStyle, stopAt?: Set<string>): Cell[] {
  const targetKey = cellKey(destination), startKey = cellKey(start);
  const queue = new Queue(), costs = new Map([[startKey, 0]]), parents = new Map<string, Cell>();
  const dx = destination.x - start.x, dy = destination.y - start.y, length = Math.max(1, Math.hypot(dx, dy));
  let order = 0;
  queue.push({ cell: start, cost: 0, priority: 0, direction: -1, order: order++ });
  while (queue.size) {
    const node = queue.pop(), key = cellKey(node.cell);
    if (node.cost !== costs.get(key)) continue;
    if (key === targetKey || stopAt?.has(key)) {
      const path: Cell[] = [node.cell]; let p = node.cell;
      while (parents.has(cellKey(p))) { p = parents.get(cellKey(p))!; path.push(p); }
      return path.reverse();
    }
    neighbors(node.cell).forEach((n, direction) => {
      const k = cellKey(n); if (!land.has(k) || blocked.has(k)) return;
      const progress = Math.max(0, Math.min(1, ((n.x - start.x) * dx + (n.y - start.y) * dy) / (length * length)));
      const cross = ((n.x - start.x) * dy - (n.y - start.y) * dx) / length;
      const bend = style === 'planned' ? 0 : Math.sin(progress * Math.PI) * Math.min(4, length * .09);
      const deviation = style === 'planned' ? 0 : Math.abs(cross - bend) * .32;
      const cost = node.cost + 1 + deviation + (direction !== node.direction && node.direction !== -1 ? (style === 'planned' ? .2 : .025) : 0);
      if (cost >= (costs.get(k) ?? Infinity)) return;
      costs.set(k, cost); parents.set(k, node.cell);
      const heuristic = Math.abs(n.x - destination.x) + Math.abs(n.y - destination.y);
      queue.push({ cell: n, cost, priority: cost + heuristic, direction, order: order++ });
    });
  }
  throw new GenerationError('A planned route cannot reach its destination on accessible land. Try another seed, larger map or fewer buildings.');
}
export function connect(start: Cell, network: Map<string, Cell>, land: Set<string>, blocked: Set<string>, style: RoadStyle): Cell[] {
  let destination: Cell | undefined, distance = Infinity;
  for (const c of network.values()) { const d = Math.abs(c.x - start.x) + Math.abs(c.y - start.y); if (d < distance) { destination = c; distance = d; } }
  if (!destination) throw new GenerationError('No connected settlement path is available.');
  return route(start, destination, land, blocked, style, new Set(network.keys()));
}
