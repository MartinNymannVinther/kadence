import { describe, expect, it } from "vitest";
import {
  firstName,
  recipientsFromCreated,
  waitingRecipients,
} from "@/components/team/invitation-recipients";

/**
 * Who a link goes to, after "Inviter hele holdet" and under "Links, der
 * venter" (docs/adr/0064): one row a person, a parent of two with both
 * children on one row, and nobody who has joined or whose link is gone.
 */

const link = (id: string) => ({
  id,
  url: `http://localhost:3000/join/${id}`,
  email: `${id}@example.com`,
  expiresAt: "2026-10-08T10:00:00.000Z",
});

describe("after the whole team is invited", () => {
  it("gives a parent of two one row with both children", () => {
    const rows = recipientsFromCreated([
      {
        rider: { id: "r1", name: "Emma Holm", birthYear: 2010, link: link("emma") },
        parents: [
          { id: "g1", name: "Anne Holm", link: link("anne") },
          { id: "g2", name: "Peter Holm", link: null },
        ],
      },
      {
        rider: { id: "r2", name: "Ida Holm", birthYear: 2012, link: null },
        parents: [{ id: "g3", name: "Anne Holm", link: link("anne") }],
      },
    ]);
    expect(rows.map((r) => [r.name, r.kind, r.children, r.link?.email ?? null])).toEqual([
      ["Emma Holm", "rider", [], "emma@example.com"],
      ["Anne Holm", "parent", ["Emma Holm", "Ida Holm"], "anne@example.com"],
      ["Peter Holm", "parent", ["Emma Holm"], null],
      ["Ida Holm", "rider", [], null],
    ]);
  });
});

describe("links still waiting", () => {
  it("lists the invited who have not joined, while the link is open", () => {
    const pending = [
      { id: "inv-emma", url: "u-emma", email: "emma@example.com", expiresAt: new Date(0) },
      { id: "inv-anne", url: "u-anne", email: "anne@example.com", expiresAt: new Date(0) },
    ];
    const rows = waitingRecipients({
      riders: [
        { id: "r1", name: "Emma Holm", userId: null, invitationId: "inv-emma" },
        { id: "r2", name: "Ida Holm", userId: null, invitationId: "inv-gone" },
        { id: "r3", name: "Oskar Lund", userId: "u3", invitationId: "inv-oskar" },
      ],
      guardians: [
        { id: "g1", riderId: "r1", name: "Anne Holm", userId: null, invitationId: "inv-anne" },
        { id: "g2", riderId: "r2", name: "Anne Holm", userId: null, invitationId: "inv-anne" },
        { id: "g3", riderId: "r9", name: "Far Ukendt", userId: null, invitationId: "inv-anne" },
      ],
      pending,
    });
    expect(rows.map((r) => [r.name, r.children, r.link?.url])).toEqual([
      ["Emma Holm", [], "u-emma"],
      ["Anne Holm", ["Emma Holm", "Ida Holm"], "u-anne"],
    ]);
  });
});

describe("a greeting", () => {
  it("uses the first name", () => {
    expect(firstName("  Emma  Holm ")).toBe("Emma");
    expect(firstName("Ida")).toBe("Ida");
  });
});
