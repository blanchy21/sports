# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: [security@sportsblock.io](mailto:security@sportsblock.io)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Resolution**: We aim to resolve critical issues within 7 days
- **Disclosure**: We will coordinate disclosure timing with you

### Scope

The following are in scope:
- Sportsblock web application
- API endpoints
- Authentication flows (Hive wallet, Firebase)
- Smart contract interactions

The following are out of scope:
- Third-party services (Hive blockchain, Firebase infrastructure)
- Social engineering attacks
- Denial of service attacks

## Security Best Practices

When contributing to Sportsblock:

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Follow the principle of least privilege
- Validate and sanitize all user inputs
- Keep dependencies updated

Thank you for helping keep Sportsblock secure.
