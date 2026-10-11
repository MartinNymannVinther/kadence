import { describe, expect, it } from "vitest";
import { callbackOf, resetLink, verifyLink } from "@/core/auth/mail-hooks";
import { invitationUrl } from "@/core/access/tokens";
import { env } from "@/core/env";
import { appLink } from "@/core/mail/links";
import { accessInvitationMail } from "@/core/mail/templates/access-invitation";
import { resetPasswordMail } from "@/core/mail/templates/reset-password";
import { teamInvitationMail } from "@/core/mail/templates/team-invitation";
import { verifyAddressMail } from "@/core/mail/templates/verify-address";
import { weekNewsMail } from "@/core/mail/templates/week-news";
import { localeOfPath, mailWords, type Mail, type MailLocale } from "@/core/mail/words";
import { joinUrl } from "@/core/team/service";
import { linksIn } from "../helpers/mail";

/**
 * What a mail may say (docs/adr/0086): a link to Kadence and the words
 * around it, in the reader's language — never a word about training or
 * health, never a rider's name beyond a parent's own child's first name
 * in an invitation, and never a link anywhere but the installation's own
 * address.
 */

const FORBIDDEN = [
  // Danish
  "træning",
  "træningen",
  "pas",
  "passet",
  "tur",
  "turen",
  "check-in",
  "trivsel",
  "helbred",
  "skade",
  "syg",
  "smerte",
  "puls",
  "watt",
  "ftp",
  "vægt",
  "søvn",
  "humør",
  "zone",
  "belastning",
  "sæsonplan",
  "kommentar",
  // English
  "training",
  "session",
  "ride",
  "wellbeing",
  "health",
  "injury",
  "ill",
  "sick",
  "pain",
  "heart rate",
  "weight",
  "sleep",
  "mood",
  "load",
  "fitness",
  "fatigue",
  "season",
  "comment",
];

const word = (w: string) => new RegExp(`(^|[^\\p{L}])${w}($|[^\\p{L}])`, "iu");
const origin = new URL(env.BETTER_AUTH_URL).origin;

/** Every mail Kadence can send, in one language, with the links its callers make. */
function everyMail(locale: MailLocale) {
  const t = mailWords(locale);
  const ba = `${origin}/api/auth`;
  const back = locale === "en" ? "%2Fen%2Freset-password" : "%2Freset-password";
  const until = "18.10.2026 20.00";
  return {
    verify: verifyAddressMail(t, {
      url: verifyLink(`${ba}/verify-email?token=jwt&callbackURL=%2Fsettings%2Fsecurity`, "jwt"),
    }),
    reset: resetPasswordMail(t, {
      url: resetLink(`${ba}/reset-password/tok?callbackURL=${back}`, "tok"),
    }),
    rider: teamInvitationMail(t, {
      inviter: "Martin Holm",
      team: "Demo CK U19",
      as: "rider",
      child: null,
      until,
      url: joinUrl("inv_rider"),
    }),
    parentOf: teamInvitationMail(t, {
      inviter: "Martin Holm",
      team: "Demo CK U19",
      as: "parent",
      child: "Emma",
      until,
      url: joinUrl("inv_parent"),
    }),
    parent: teamInvitationMail(t, {
      inviter: "Martin Holm",
      team: "Demo CK U19",
      as: "parent",
      child: null,
      until,
      url: joinUrl("inv_parent2"),
    }),
    member: teamInvitationMail(t, {
      inviter: "Martin Holm",
      team: "Demo CK U19",
      as: "member",
      child: null,
      until,
      url: joinUrl("inv_member"),
    }),
    access: accessInvitationMail(t, {
      inviter: "Martin Holm",
      workspace: "Holbæk CK",
      until,
      url: invitationUrl("tok"),
    }),
    week: weekNewsMail(t, { url: appLink("/parents", locale) }),
  };
}

describe.each(["da", "en"] as const)("every mail in %s", (locale) => {
  const mails: Record<string, Mail> = everyMail(locale);

  it.each(Object.keys(mails))("%s says nothing about training or health", (name) => {
    const { subject, text } = mails[name]!;
    for (const w of FORBIDDEN) expect(`${subject}\n${text}`, w).not.toMatch(word(w));
  });

  it.each(Object.keys(mails))("%s links only to the installation's own address", (name) => {
    const links = linksIn(mails[name]!.text);
    expect(links.length).toBe(1);
    for (const link of links) expect(new URL(link).origin).toBe(origin);
  });

  it.each(Object.keys(mails))("%s is in the reader's language, plainly", (name) => {
    const { subject, text } = mails[name]!;
    expect(text.startsWith(locale === "en" ? "Hi" : "Hej")).toBe(true);
    expect(text.endsWith("Kadence")).toBe(true);
    expect(`${subject}${text}`).not.toContain("!");
    expect(subject.length).toBeGreaterThan(5);
    expect(subject).not.toContain("\n");
  });
});

describe("what a mail names", () => {
  it("a parent's invitation names the child by first name, as the join page does, and nobody else", () => {
    const { parentOf, parent, rider } = everyMail("da");
    expect(parentOf.text).toContain("som forælder til Emma.");
    expect(parentOf.text).toContain("Når Emma har sagt ja til dig i Kadence");
    expect(parent.text).toContain("som forælder.");
    expect(parent.text).not.toContain("Emma");
    expect(rider.text).toContain("som rytter.");
    expect(rider.text).not.toContain("Emma");
  });

  it("the week says that there is news and nothing else", () => {
    const { week } = everyMail("da");
    expect(week.subject).toBe("Der er nyt om ugen i Kadence");
    expect(week.text).toContain(`${origin}/parents`);
    expect(everyMail("en").week.text).toContain(`${origin}/en/parents`);
  });
});

describe("the links Better Auth's mails carry", () => {
  it("send a new password to Kadence's own page, in the language it was asked from", () => {
    const da = new URL(
      resetLink(`${origin}/api/auth/reset-password/t1?callbackURL=%2Freset-password`, "t1"),
    );
    expect(da.origin).toBe(origin);
    expect(da.pathname).toBe("/reset-password");
    expect(da.searchParams.get("token")).toBe("t1");
    expect(da.searchParams.get("via")).toBe("mail");
    const en = new URL(
      resetLink(`${origin}/api/auth/reset-password/t2?callbackURL=%2Fen%2Freset-password`, "t2"),
    );
    expect(en.pathname).toBe("/en/reset-password");
  });

  it("follow only a path on this site back, never an address elsewhere", () => {
    expect(callbackOf("https://x.test/a?callbackURL=%2Fsettings%2Fsecurity")).toBe(
      "/settings/security",
    );
    expect(callbackOf("https://x.test/a?callbackURL=https%3A%2F%2Fevil.test")).toBeNull();
    expect(callbackOf("https://x.test/a?callbackURL=%2F%2Fevil.test")).toBeNull();
    expect(callbackOf("not a url")).toBeNull();
    const verify = new URL(
      verifyLink("https://evil.test/x?callbackURL=https%3A%2F%2Fevil.test", "jwt"),
    );
    expect(verify.origin).toBe(origin);
    expect(verify.pathname).toBe("/api/auth/verify-email");
    expect(verify.searchParams.get("callbackURL")).toBe("/");
  });

  it("read the language from the path", () => {
    expect(localeOfPath("/en")).toBe("en");
    expect(localeOfPath("/en/settings/security?verified=1")).toBe("en");
    expect(localeOfPath("/english")).toBe("da");
    expect(localeOfPath("/settings/security")).toBe("da");
    expect(localeOfPath(null)).toBe("da");
  });
});
