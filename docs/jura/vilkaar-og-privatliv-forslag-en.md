# Proposal: /terms split into Terms and Privacy policy — English texts

> **UDKAST til Martins rådgiver — ikke gennemgået af en jurist.**
> The English versions of the two texts proposed in
> [vilkaar-og-privatliv-forslag.md](vilkaar-og-privatliv-forslag.md), for
> `messages/en.json`. The reasoning, the notes for the adviser and the
> mapping of keys are in the Danish file. Square brackets mark what waits
> for S-01, S-07 or S-08.

---

## Part 1: Terms (English)

**Terms**

_Last updated [date]._

Kadence is an open source tool for training planning for cyclists, their
coaches and their parents. It is run by Vinther Consulting under the name
Haij. This is the agreement between you and us when you use the edition we
run at kadence.haij.dk. If you run the code yourself, only the licence
applies. What happens to your information is in the
[Privacy policy](/en/privacy).

**What Kadence is**
A tool to plan and follow training: sessions in a calendar, rides from
files and devices, a daily check-in and a season plan. Recommendations and
AI proposals are drafts, not answers, and replace neither a coach nor a
doctor.

**A team, or you alone**
A workspace is either a team that a club owns, or your own. On a team the
club decides over the team's data, and we process it for the club under a
data processing agreement. In your own workspace you decide, and we are
responsible for how the information is processed.

**Account and age**
You get in by being invited by a team, by applying, or [once S-08 is
built] by signing up yourself with an email address you confirm. If you
are under 15, a parent creates the workspace and invites you. That is the
rule in Danish data protection law for children's consent to online
services. We store your name and email and use them to sign you in.
Passwords are stored hashed, and you can add a passkey and two-factor.

**Your data**
What you write in Kadence is yours and your team's. A rider's training and
check-ins are about the rider, and the rider decides what their parents
see. Everything can be downloaded as a spreadsheet and JSON in one click
and deleted again. We sell nothing and pass nothing on. We do not look at
your data unless you ask us for help. Whoever runs the server can
technically read the database; that is used only to run it and to fix
faults.

**AI**
With a language model set up, when a coach asks for a proposal, what it
builds on is sent to the model provider. Riders' check-ins and points of
attention are sent only if the team has turned that on. The AI proposes;
it writes, sends and deletes nothing without a person saying yes. Without
a model, everything else works.

**Invitations and links**
An invitation link is for one address, works once and expires after a
week. A link to a new password that a coach makes for you works once
within an hour, and your security page shows who made it. Share links only
with the person they are for. [Until S-07:] Kadence sends no email, so
whoever makes a link passes it on.

**What we ask of you**
Put information about others in only when you are allowed to. In the
coaches' room coaches share experience; keep riders' names out of it. Do
not put real personal data in the demo.

**Leaving**
You can delete your workspace immediately, without writing to anyone and
without waiting. The export is one click away and readable without
Kadence. We keep no copy afterwards beyond the nightly encrypted backups,
which roll off after 30 days. Your account is deleted when you ask [once
S-01/S-08 are built: under Settings → Me].

**Price**
Kadence is free during the pilot winter 2026–27. After that there will be
a single fee for running and maintaining the service. It is announced at
least three months ahead, and no feature is for paying users only.

**Operation and guarantees**
Kadence is new, and there is no uptime guarantee. We look after your data
with encrypted backups every night, but you should download an export now
and then. The service is provided as is, without guarantees beyond what
mandatory law requires.

**Licence**
The code is AGPL-3.0. You may use it, change it and run it yourself; if
you change it and offer it to others over a network, your changes must be
available too. What you write in the tool is not covered by the licence.
It is yours.

**The demo** _(shown only when the demo is on)_
A demo workspace is created without email or sign-up and deleted entirely
after {hours} hours, account included. Do not put real personal data in
it.

**When the terms change**
If we change something that matters to you, it is posted here with a date
at least 30 days before it applies, and you are told the next time you
sign in.

**Law and disputes**
Danish law applies. If you are a consumer, you always keep the rights
mandatory law gives you.

**Contact**
Write to martin@vintherconsulting.dk. If you have found a security
problem, SECURITY.md in the repository says how to report it; use that
rather than an ordinary email.

---

## Part 2: Privacy policy (English)

**Privacy policy**

_Last updated [date]._

This says what information Kadence processes about you, why, who sees it,
and how you download or delete it. In short: it stays in the EU, nobody
sells it, and you can take it out and delete it yourself.

**Who is responsible**
It depends on where you are:

- **On a team** the club is the controller of the team's data: the
  riders' training, check-ins and measurements, parent links and the
  team's calendar. We process it only on the club's instructions and under
  a data processing agreement. Ask the club first; we help the club answer.
- **Alone**, in your own workspace, we are the controller.
- **Always us**: your account (name, email, sign-in), applications for
  access, the coaches' room, the demo and the open page of Danish teams.

Us: Vinther Consulting (Haij), CVR [ ], martin@vintherconsulting.dk.

**What we process**

- Your account: name, email, password as a hash, passkeys, the two-factor
  secret, and when and from which IP address and browser you sign in.
- As a rider: birth year, sex if you choose it, class, UCI ID if set,
  your sessions, rides with time, power, heart rate and GPS track,
  comments, calendar, season plan, goals and race results from Cycling
  Denmark's public pages.
- Your daily check-in: sleep, energy, mood, soreness, stress, pain and
  where, illness and a note. And measurements: height, heart rate, FTP,
  and weight from the year you turn 19, or earlier if the team has turned
  it on.
- As a parent: your name, your email and which rider you follow.
- If you turn reminders on: your browser's push address.

Check-ins, measurements and heart rate are **health data**. We take extra
care of them.

**Why, and on what basis**

| What                                          | Why                                             | Legal basis                                                                           |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Your account and workspace                    | To provide Kadence to you                       | The agreement with you (GDPR art. 6(1)(b))                                            |
| Check-ins, measurements and heart rate, alone | So you can follow how you are and how you train | Your explicit consent (art. 9(2)(a) and art. 6(1)(a))                                 |
| The team's data                               | The club's purposes                             | The club's basis; ask the club                                                        |
| Sign-in, IP address and the audit trail       | To keep Kadence secure and see who did what     | Our legitimate interest in security (art. 6(1)(f)) and the duty of security (art. 32) |
| Applications for access                       | To decide whether to let you in                 | Steps before an agreement (art. 6(1)(b))                                              |

**Consent to health data when you are alone**
When you create your own workspace, we ask whether Kadence may keep your
check-ins and measurements. If you say yes, you can withdraw it under
Settings → Data. Kadence then turns check-in and measurements off, the
check-ins and measurements you have are deleted after you have had the
chance to download them, and the rest works as before: the calendar, the
rides, the season plan and Rulle. What we did before you withdrew is still
lawful (art. 7(3)). If you are under 15, your parent gives and withdraws
the consent.

**Age**
You can create an account and give consent yourself from the age of 15.
Under 15, a parent creates your workspace and consents for you (Danish
Data Protection Act section 6(2) and (3), and GDPR art. 8). On a team, the
club makes sure of consent from you or your parents.

**Who sees what**

- **Your team's coach** sees everything you log. That is what a coach is
  for. If you want to keep something to yourself, do not log it.
- **Your teammates** see nothing of your training or check-ins.
- **Your parents** see nothing until you have confirmed them. Then they
  see your profile, your training unless you say no, and your check-ins
  only if you say yes. From 1 January of the year you turn 18 they see
  something only if you confirm them again.
- **The AI** sees something only when a coach asks for a proposal, and
  only your first name and your points of attention if the team has said
  yes.
- **We** do not look at your data unless you ask us for help. Whoever runs
  the server can technically read the database and uses that only to run
  it and fix faults.

This is set up in the database, not only in the code, and tests prove it.

**Who we give information to**
Our suppliers are in the list of subprocessors: Hetzner in Germany runs
the server and the backups, and Mistral in the EU answers when a coach
asks the AI for a proposal. We give them only what they need. Nobody else
gets information from us. [Once S-07 is built: Scaleway in France sends
our emails about your account.]

**Outside the EU**
We send nothing outside the EU. Two things you choose yourself:

- **Wahoo, Garmin and Polar.** If you connect your account, your rides
  come in by themselves. Wahoo and Garmin are in the US, Polar in Finland.
  Only you can connect, and you can disconnect at any time. All that goes
  to them is a session when you or your coach press "send", never your
  check-ins. What they do with your rides is between you and them.
- **Reminders.** If you turn them on, an empty message goes through your
  browser's push service (Apple, Google, Mozilla or Microsoft). The message
  carries nothing; the words are fetched from Kadence when it is shown.

**How long**

- Your workspace and everything in it: until you delete it. That happens
  immediately.
- Backups: 30 days.
- Your account: until you ask us to delete it.
- The audit trail: as long as the workspace exists. [Planned: rows about
  riders are deleted after 24 months.]
- Applications for access: [Proposal: 6 months after the decision. Today
  they are not deleted by themselves.]
- The reminders' address: until you turn them off or leave the team.
- The demo: {hours} hours.

**Your rights**
You have the right to know what we hold about you and to receive it
(art. 15 and 20), to have it corrected (art. 16), erased (art. 17),
restricted (art. 18), and to object (art. 21). Most of it you do
yourself: download your data under Settings → Data, correct it where it
stands, and delete your workspace under Settings → Workspace. On a team
the coach erases a rider entirely when the rider or the parents ask. For
the rest, write to us; we answer within a month (art. 12(3)).

**Email**
Kadence sends no email today. [Once S-07 is built: We send only email
about your account: confirming your address, invitations and links to a
new password. Never newsletters or advertising.]

**Cookies**
Kadence uses only the cookies needed for you to sign in and use what you
have chosen yourself. No statistics, no advertising, no cookies from
anyone else.

| Cookie                                    | What it does                                                          | How long                            |
| ----------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `__Secure-better-auth.session_token`      | Keeps you signed in                                                   | 7 days, extended as you use Kadence |
| `__Secure-better-auth.two_factor`         | During sign-in with two-factor                                        | A few minutes                       |
| `better-auth-passkey`                     | During sign-in or setup with a passkey                                | A few minutes                       |
| `kadence_device_oauth`                    | While you connect Wahoo, Garmin or Polar                              | 10 minutes                          |
| `NEXT_LOCALE`                             | Remembers the language when it differs from your browser's            | Until you close the browser         |
| `kadence-sidebar`, `kadence-sidebar-tone` | Remembers whether the menu is hidden, and its colour, once you choose | 1 year                              |

Rulle keeps a ride in your browser while you are offline and sends it when
you are back online. A draft of a week is also kept in the browser until
you save it.

**The demo** _(shown only when the demo is on)_
The demo creates an account without email, which is deleted with
everything in it after {hours} hours. Do not put real information in it.

**Complaints**
If you are unhappy with how we process your information, write to us. You
can always complain to the Danish Data Protection Agency (Datatilsynet),
Carl Jacobsens Vej 35, 2500 Valby, Denmark, dt@datatilsynet.dk,
www.datatilsynet.dk (art. 77).

**Changes**
If we change something that matters to you, it is posted here with a
date, and you are told the next time you sign in.
