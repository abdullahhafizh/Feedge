# Contributing to Feedge

Thank you for your interest in contributing to Feedge! This document outlines the guidelines for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Fork Policy](#fork-policy)
- [Attribution Requirements](#attribution-requirements)
- [Pull Request Process](#pull-request-process)
- [Development Setup](#development-setup)

## 📜 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## 🍴 Fork Policy

### ✅ Correct Way to Use This Project

1. **Fork via GitHub** - Use the "Fork" button on GitHub to create your own copy
2. **Keep the fork relationship visible** - Your repo should show "forked from [original]"
3. **Maintain attribution** - Keep the LICENSE, NOTICE, and copyright headers intact
4. **Link back** - Reference the original project in your README

### ❌ What You Should NOT Do

1. **Do NOT clone and re-upload as a new repository** - This breaks the fork chain and is against our license terms
2. **Do NOT remove attribution** - The NOTICE file and copyright headers must remain
3. **Do NOT claim this as your original work** - Derivative works must acknowledge the original
4. **Do NOT use the "Feedge" trademark** - The name and branding are protected

### Why This Matters

- Fork relationships help the community track the project's history
- Proper attribution respects the original authors' work
- GitHub's fork network provides valuable metrics and discoverability
- It prevents confusion about which repository is the original

## 📝 Attribution Requirements

Under the Apache 2.0 License, you MUST:

1. **Keep the LICENSE file** - Include it in all copies
2. **Keep the NOTICE file** - This contains required attributions
3. **State changes** - If you modify the code, note what you changed
4. **Preserve copyright notices** - Don't remove headers from source files

### Example Attribution

If you create a derivative work, add this to your README:

```markdown
## Attribution

This project is based on [Feedge](https://github.com/abdullahhafizh/Feedge),
originally created by Abdullah Hafizh.
```

## 🔄 Pull Request Process

### For Bug Fixes and Small Changes

1. Fork the repository (via GitHub's Fork button)
2. Create a feature branch (`git checkout -b fix/my-fix`)
3. Make your changes
4. Run tests (`bun test`)
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

### For Large Features

1. Open an Issue first to discuss the feature
2. Wait for approval before starting work
3. Follow the same process as above

### Commit Message Format

We use conventional commits:

```
type(scope): description

- Detail 1
- Detail 2
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🛠️ Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_FORK/Feedge.git
cd Feedge

# Install dependencies
bun install

# Copy environment file
cp .env.example .env
# Edit .env and set SIGNING_SECRET

# Run development server
bun dev

# Run tests
bun test

# Type check
bun run typecheck
```

## 📄 License

By contributing to Feedge, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Thank You

Your contributions help make Feedge better for everyone. We appreciate your respect for the project's licensing and attribution requirements.

---

**Questions?** Open an issue or reach out to the maintainers.
