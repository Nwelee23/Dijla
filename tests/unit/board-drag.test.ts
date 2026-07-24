import { describe, expect, it } from "vitest";

import { laneOfStatus, resolveDrop } from "@/lib/board-drag";

describe("laneOfStatus", () => {
  it("groups accepted with preparing and out_for_delivery with ready", () => {
    expect(laneOfStatus("new")).toBe("new");
    expect(laneOfStatus("accepted")).toBe("preparing");
    expect(laneOfStatus("preparing")).toBe("preparing");
    expect(laneOfStatus("ready")).toBe("ready");
    expect(laneOfStatus("out_for_delivery")).toBe("ready");
  });

  it("returns null for statuses that have no lane", () => {
    expect(laneOfStatus("delivered")).toBeNull();
    expect(laneOfStatus("cancelled")).toBeNull();
  });
});

describe("resolveDrop", () => {
  it("advances forward to the target lane's entry status", () => {
    expect(resolveDrop("new", "preparing")).toEqual({ kind: "forward", to: "preparing" });
    expect(resolveDrop("new", "ready")).toEqual({ kind: "forward", to: "ready" });
    expect(resolveDrop("preparing", "ready")).toEqual({ kind: "forward", to: "ready" });
  });

  it("enters the ready lane as `ready`, never out_for_delivery", () => {
    // The driver hand-off must stay a deliberate button, not a drag effect.
    expect(resolveDrop("preparing", "ready")).toEqual({ kind: "forward", to: "ready" });
  });

  it("treats a drop on the same lane as a no-op", () => {
    expect(resolveDrop("accepted", "preparing")).toEqual({ kind: "same" });
    expect(resolveDrop("out_for_delivery", "ready")).toEqual({ kind: "same" });
  });

  it("rejects a backward drag", () => {
    expect(resolveDrop("ready", "new")).toEqual({ kind: "backward" });
    expect(resolveDrop("preparing", "new")).toEqual({ kind: "backward" });
    expect(resolveDrop("ready", "preparing")).toEqual({ kind: "backward" });
  });

  it("is a no-op for a status outside the lanes", () => {
    expect(resolveDrop("delivered", "ready")).toEqual({ kind: "same" });
  });
});
