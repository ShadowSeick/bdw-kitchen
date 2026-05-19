import { LoroMap } from "loro-crdt";

if (!(LoroMap.prototype as any).delete_) {
  (LoroMap.prototype as any).delete_ = function (key: string) {
    return this.delete(key);
  };
}

export * from "loro-crdt";
