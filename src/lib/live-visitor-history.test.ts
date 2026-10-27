import { describe, expect, it } from "vitest";
import { uniqueVisitors, visitorKey } from "./live-visitor-history";

describe("live visitor grouping", () => {
  it("counts one person refreshing and rotating the bar as one visitor", () => {
    const rows = [
      { id: "r3", session_id: "abc", path: "/dashboard" },
      { id: "r2", session_id: "abc", path: "/" },
      { id: "r1", session_id: "abc", path: "/apply" },
      { id: "r0", session_id: "xyz", path: "/" },
    ];
    const visitors = uniqueVisitors(rows);
    expect(visitors).toHaveLength(2);
    expect(visitors[0].path).toBe("/dashboard");
  });

  it("gives the same visitor the same identity across rows", () => {
    expect(visitorKey({ id: "a", session_id: "s1" })).toBe(visitorKey({ id: "b", session_id: "s1" }));
  });

  it("treats rows without a session as separate visitors", () => {
    expect(uniqueVisitors([{ id: "a", session_id: null }, { id: "b", session_id: null }])).toHaveLength(2);
  });
});
