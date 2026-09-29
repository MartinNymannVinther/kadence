# Security Policy

Kadence is a multi-tenant tool for training planning for young cyclists.
It holds health data — training, sleep, pain, wellbeing — about riders who
are often under 18, so team isolation, the separation of riders inside a
team and data protection are its most important properties. We take every report
seriously and appreciate the time it takes to make one.

## Reporting a vulnerability

- Email **security@haij.dk** with a description, reproduction steps and the
  impact you believe it has. Danish or English both work.
- Please do not open public issues for security problems, and do not access
  or modify data belonging to workspaces that are not your own test data.
- You will get an acknowledgement within 72 hours and a status update at
  least every two weeks until the issue is resolved.
- We aim to fix confirmed vulnerabilities within 90 days and will credit
  you in the release notes if you want.

There is currently no bug bounty program.

## Scope notes

Particularly interesting: anything that lets one team read or write
another team's data (RLS bypass); anything that lets a rider see a
teammate's training or check-ins, or a parent see more than the rider
shares with them, or see anything before the rider confirmed the link;
confirming a guardian as anyone but the rider; authentication bypass;
audit-log tampering or a non-coach reading it; an invitation link that
admits somebody it should not or links them to the wrong rider; a FIT file
or a device webhook that crashes the decoder, reaches another rider's
data or writes where it should not; an upload key that reads anything,
writes for anyone but its rider, or works after it was removed; a prompt that reaches the model as
instructions rather than data; and injection of any kind. The RLS test suite in `tests/rls/` is
the executable specification of the isolation model.

## Supported versions

Pre-1.0, only the latest `main` is supported.
