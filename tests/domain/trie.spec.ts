import { Trie } from "@/domain/trie";

describe("Trie", () => {
  it("stores and retrieves values by path", () => {
    const trie = new Trie<string>();
    trie.set(["monday", "breakfast"], "recipe-1");
    trie.set(["monday", "lunch"], "recipe-2");
    trie.set(["tuesday", "dinner"], "recipe-3");

    expect(trie.get(["monday", "breakfast"])).toBe("recipe-1");
    expect(trie.get(["monday", "lunch"])).toBe("recipe-2");
    expect(trie.get(["tuesday", "dinner"])).toBe("recipe-3");
    expect(trie.get(["wednesday", "brunch"])).toBeUndefined();
    expect(trie.get(["monday"])).toBeUndefined();
    expect(trie.has(["monday", "breakfast"])).toBe(true);
    expect(trie.has(["monday"])).toBe(false);
  });

  it("overwrites values on repeated set", () => {
    const trie = new Trie<string>();
    trie.set(["a"], "first");
    trie.set(["a"], "second");
    expect(trie.get(["a"])).toBe("second");
  });

  it("diffs paths via DFS", () => {
    const oldTrie = new Trie<string>();
    oldTrie.set(["monday", "breakfast"], "recipe-1");
    oldTrie.set(["monday", "lunch"], "recipe-2");
    oldTrie.set(["friday", "dinner"], "recipe-3");

    const newTrie = new Trie<string>();
    newTrie.set(["monday", "breakfast"], "recipe-1"); // unchanged
    newTrie.set(["monday", "lunch"], "recipe-2-new"); // changed
    // friday removed
    newTrie.set(["sunday", "brunch"], "recipe-4"); // added

    const diff = oldTrie.diff(newTrie);
    expect(diff).toHaveLength(3);
    expect(diff).toEqual(
      expect.arrayContaining([
        {
          path: ["monday", "lunch"],
          oldValue: "recipe-2",
          newValue: "recipe-2-new",
        },
        {
          path: ["friday", "dinner"],
          oldValue: "recipe-3",
          newValue: undefined,
        },
        {
          path: ["sunday", "brunch"],
          oldValue: undefined,
          newValue: "recipe-4",
        },
      ]),
    );
  });

  it("returns no diff for identical tries", () => {
    const a = new Trie<string>();
    const b = new Trie<string>();
    a.set(["x", "y"], "v");
    b.set(["x", "y"], "v");
    expect(a.diff(b)).toEqual([]);
  });

  it("walks entirely missing subtrees", () => {
    const oldTrie = new Trie<string>();
    oldTrie.set(["a", "b", "c"], "deep");

    const newTrie = new Trie<string>();
    const diff = oldTrie.diff(newTrie);
    expect(diff).toEqual([
      { path: ["a", "b", "c"], oldValue: "deep", newValue: undefined },
    ]);
  });
});
