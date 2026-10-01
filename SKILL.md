# justmd — agent skill

Render a markdown file to a **self-contained HTML file** — GitHub-flavored tables,
mermaid diagrams, syntax-friendly theme. No network needed at view time.

## When to use

Use when the user wants to **read or check** a `.md` file where terminal rendering
falls short: tables with prose cells, mermaid/flowchart blocks, long structured
documents. Do not use for editing.

## Usage

```sh
npx justmd <file.md>              # write <file>.html, print its path
npx justmd <file.md> -o out.html  # choose output path
npx justmd <file.md> --open       # also launch in the default browser
```

## Contract

- Output is a single `.html` file with zero external references (mermaid inlined,
  ~3.5 MB overhead). Send it anywhere — phone, chat attachment, air-gapped machine —
  and it renders identically.
- Prints the absolute output path on stdout; errors on stderr with non-zero exit.
- Reads only the input file; writes only the output file. Safe for untrusted trees.

## Notes for agents

- The output path is deterministic (`<input>.html` unless `-o`), so you can chain it:
  `npx justmd report.md && xdg-open report.html`.
- Mermaid blocks (` ```mermaid `) render as diagrams; malformed diagrams show
  mermaid's error text — not a tool failure, a source error.
- If the file has no `# heading`, the output `<title>`/page header falls back to the
  input filename.
