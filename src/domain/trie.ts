interface TrieDiff<V> {
  path: string[];
  oldValue: V | undefined;
  newValue: V | undefined;
}

class Trie<V> {
  value: V | undefined;
  children: Map<string, Trie<V>>;

  constructor() {
    this.value = undefined;
    this.children = new Map();
  }

  set(path: readonly string[], value: V): void {
    let node: Trie<V> = this;
    for (const key of path) {
      let child = node.children.get(key);
      if (!child) {
        child = new Trie<V>();
        node.children.set(key, child);
      }
      node = child;
    }
    node.value = value;
  }

  get(path: readonly string[]): V | undefined {
    let node: Trie<V> = this;
    for (const key of path) {
      const child = node.children.get(key);
      if (!child) return undefined;
      node = child;
    }
    return node.value;
  }

  has(path: readonly string[]): boolean {
    return this.get(path) !== undefined;
  }

  *entries(prefix: string[] = []): IterableIterator<[string[], V]> {
    if (this.value !== undefined) {
      yield [[...prefix], this.value];
    }
    for (const [key, child] of this.children) {
      yield* child.entries([...prefix, key]);
    }
  }

  diff(other: Trie<V>): TrieDiff<V>[] {
    const out: TrieDiff<V>[] = [];
    walk(this, other, [], out);
    return out;
  }
}

function walk<V>(
  a: Trie<V> | undefined,
  b: Trie<V> | undefined,
  path: string[],
  out: TrieDiff<V>[],
): void {
  const oldValue = a?.value;
  const newValue = b?.value;
  if (oldValue !== newValue) {
    out.push({ path: [...path], oldValue, newValue });
  }

  const keys = new Set<string>();
  if (a) {
    for (const key of a.children.keys()) {
      keys.add(key);
    }
  }
  if (b) {
    for (const key of b.children.keys()) {
      keys.add(key);
    }
  }

  for (const key of keys) {
    walk(a?.children.get(key), b?.children.get(key), [...path, key], out);
  }
}

export { Trie, TrieDiff };
