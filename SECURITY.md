# Security Policy

## Supported Versions

We provide security updates for the current major/minor release.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

Security of user data, local storage privacy, and client runtime is taken seriously. If you discover a potential security vulnerability in **Local Tarot Draw**:

1. **Do not create a public GitHub issue.**
2. Please report the vulnerability privately to the project maintainers via GitHub Security Advisories or by contacting the maintainer via GitHub profile `divenire990`.
3. Provide as much detail as possible:
   - Operating system and desktop environment
   - Detailed reproduction steps or Proof-of-Concept (PoC)
   - Impact assessment
4. We will acknowledge receipt of your report within 48 hours and provide a timeline for triage and resolution.

## Local Data & Privacy Security

- **Zero Remote Telemetry**: Local Tarot Draw does not send card draws, reading notes, or system metadata to any remote servers.
- **Local File Isolation**: All readings and session records are stored strictly in the user's local directory (default: `Documents/TarotDraws`).
