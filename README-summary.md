# Files

> A web-based personal file manager — live at **[files.oppshan.com](https://files.oppshan.com)**.
>
> by Warren Nocos for ITMD 504 — Programming and Application Foundations at Illinois Institute of Technology.

Users sign in with Google, upload, organize, download, rename, delete, and inspect files and folders through a
browser-based interface. File content is encrypted at rest using AES/CTR with per-file IVs and a PBKDF2-derived key.

*This is a one-page summary. For the full documentation, open `README.pdf` or read the pageless version of
the [README on GitHub](https://github.com/warrenmnocos/oppshan-files/blob/main/README.md).*

## Quick links

| Resource             | URL                                                                            |
|----------------------|--------------------------------------------------------------------------------|
| **Live application** | <https://files.oppshan.com>                                                    |
| Source code          | <https://github.com/warrenmnocos/oppshan-files>                                |
| Full documentation   | <https://github.com/warrenmnocos/oppshan-files/blob/main/README.md>            |
| CI/CD                | <https://github.com/warrenmnocos/oppshan-files/actions>                        |
| Figma prototype      | <https://figma.com/make/Wkr8DV1ZpKmnbnxNSMVgMs/Oppshan-Files?p=f&fullscreen=1> |
| Project board        | <https://github.com/users/warrenmnocos/projects/1>                             |

## Tech stack

| Layer             | Stack                                                                                                   |
|-------------------|---------------------------------------------------------------------------------------------------------|
| Backend           | Java 25 · Virtual threads · Quarkus 3.34.3 · Hibernate ORM · Jakarta Data · Quarkus OIDC (Google)       |
| Frontend          | Angular 21 · TypeScript · SCSS · signals-first · RxJS · two-way data binding · custom event bus (CQRS)  |
| Database          | PostgreSQL 18 · Flyway migrations · recursive-CTE named native queries                                  |
| Hosting           | AWS EC2 t4g.small (Graviton 2 ARM) · Amazon Linux 2023 · Caddy TLS · Let's Encrypt · Route 53 DNS       |
| CI/CD             | Maven · GitHub Actions OIDC federation · AWS S3 and SSM Run Command (no SSH, no long-lived AWS keys)    |
| Quality           | JaCoCo coverage · Qodana static analysis · Quarkus Dev Services with real PostgreSQL via Testcontainers |
| Production binary | GraalVM 25 native image · ARM64                                                                         |

## Project management

- 7 sprints on a GitHub Projects board
- 28 user stories with acceptance criteria, tracked as GitHub issues end-to-end
- One feature branch per epic, named `<issue#>-epic-XX-<slug>` (large epics ship in numbered parts; EPIC-07 spanned
  five)
- 24 wireframe mockups, one per user-facing screen state
- All commits reference issues via `refs #N <description>`

## In this submission

- **`README.pdf`** — full 41-page documentation: architecture, data model, API reference, security, UX wireframes, CI/CD
  pipeline, development setup
- **`README-summary.pdf`** — this page
