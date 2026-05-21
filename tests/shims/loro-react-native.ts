import { LoroDoc, LoroMap } from "loro-crdt";

if (!(LoroMap.prototype as any).delete_) {
  (LoroMap.prototype as any).delete_ = function (key: string) {
    return this.delete(key);
  };
}

// loro-react-native exposes string enums; mirror just the ones CalendarSync reads.
export const Diff_Tags = {
  List: "List",
  Text: "Text",
  Map: "Map",
  Tree: "Tree",
  Counter: "Counter",
  Unknown: "Unknown",
} as const;

export const Index_Tags = {
  Key: "Key",
  Seq: "Seq",
  Node: "Node",
} as const;

export const ContainerId_Tags = {
  Root: "Root",
  Normal: "Normal",
} as const;

export const LoroValue_Tags = {
  Null: "Null",
  Bool: "Bool",
  Double: "Double",
  I64: "I64",
  Binary: "Binary",
  String: "String",
  List: "List",
  Map: "Map",
  Container: "Container",
} as const;

// loro-crdt represents Value as string/number/bool/etc. and Container references as
// objects. loro-react-native wraps both in a ValueOrContainerInterface with
// asValue()/asContainer(). Provide a tiny adapter for what CalendarSync needs.
function wrapValueOrContainer(v: unknown) {
  if (v !== null && typeof v === "object") {
    return {
      asValue: () => undefined,
      asContainer: () => v,
      isValue: () => false,
      isContainer: () => true,
    };
  }
  let tag: string;
  if (typeof v === "string") tag = LoroValue_Tags.String;
  else if (typeof v === "boolean") tag = LoroValue_Tags.Bool;
  else if (typeof v === "number") tag = LoroValue_Tags.Double;
  else tag = LoroValue_Tags.Null;
  return {
    asValue: () => ({ tag, inner: { value: v } }),
    asContainer: () => undefined,
    isValue: () => true,
    isContainer: () => false,
  };
}

function translatePath(path: Array<string | number>) {
  return path.map((step) => ({
    container: undefined,
    index:
      typeof step === "number"
        ? { tag: Index_Tags.Seq, inner: { index: step } }
        : { tag: Index_Tags.Key, inner: { key: step } },
  }));
}

function translateDiff(diff: any) {
  if (diff?.type === "map") {
    const updated = new Map<string, ReturnType<typeof wrapValueOrContainer> | undefined>();
    for (const [k, v] of Object.entries(diff.updated as Record<string, unknown>)) {
      updated.set(k, v === undefined ? undefined : wrapValueOrContainer(v));
    }
    return { tag: Diff_Tags.Map, inner: { diff: { updated } } };
  }
  return { tag: Diff_Tags.Unknown, inner: {} };
}

function translateEvent(event: any) {
  return {
    target: event.target,
    path: translatePath(event.path ?? []),
    isUnknown: false,
    diff: translateDiff(event.diff),
  };
}

if (!(LoroDoc.prototype as any).subscribeRoot) {
  (LoroDoc.prototype as any).subscribeRoot = function (cb: (event: any) => void) {
    const unsub = this.subscribe((batch: any) => {
      cb({
        triggeredBy: 0,
        origin: batch.origin ?? "",
        currentTarget: batch.currentTarget,
        events: (batch.events ?? []).map(translateEvent),
      });
    });
    return {
      unsubscribe: () => {
        if (typeof unsub === "function") unsub();
      },
      detach: () => {},
    };
  };
}

export * from "loro-crdt";
