`src/app` owns application bootstrap, router assembly, shell composition, providers, and global overlays.

Rules:
- Import feature public APIs from `@/features/<name>` or `@/features/<name>/routes`.
- Do not import from `@/views`, `@/components/pages`, or `@/modules`.
- Keep feature-specific behavior out of the shell.
