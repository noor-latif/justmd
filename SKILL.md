# justmd — agent skill

Render a markdown file to a **self-contained HTML file** — GitHub-flavored tables,
mermaid diagrams, syntax-friendly theme. No network needed at view time.

## When to use

Use when the user wants to **read or check** a `.md` file where terminal rendering
falls short: tables with prose cells, mermaid/flowchart blocks, long structured
documents. Use `--review` when the user should comment on a draft; never edit
the markdown through the browser yourself.

**Also the markdown → PDF path for this workspace** (no pandoc/wkhtmltopdf
installed). When a deliverable must be a PDF — a recipient that rejects `.md`
attachments, or "convert this markdown to PDF" — render with justmd, then print
the HTML with headless Chrome. Never hand-author HTML for existing markdown;
that silently drifts from the source.

## Usage

```sh
npx justmd <file.md>              # write <file>.html, print its path
npx justmd <file.md> -o out.html  # choose output path
npx justmd <file.md> --open       # also launch in the default browser
npx justmd <file.md> --review     # let the user comment in the browser
```

## Review: collect the user's comments

Use when the user should review a draft (a letter, a post, a plan) and you need
their comments back. Run it as a background job and wait for it to exit:

```sh
npx justmd draft.md --review
# stdout: <abs>/draft.html, "review: http://127.0.0.1:<port>/",
# "comments: <abs>/draft.comments.md"; when the user presses Send to AI:
# "done: N comment(s) in …" followed by the comments file itself.
```

Exit 0 means the user sent. The comments (also in `draft.comments.md`) are one
`## N · line L` section per comment with the quoted passage, an optional
`**Replace with:**` block (the text the user wants instead) and an optional
`**Comment:**`; zero comments reads "No changes requested". Apply them to
`draft.md`; the line number is a best-effort pointer, the quote is
authoritative.

Rounds: after editing `draft.md`, run `--review` again. The open tab updates in
place by itself (it watches the file), the second run reuses the running
server and opens no new tab, and it again blocks until the next Send. Every
version of the file is kept in `.justmd/draft/vNNN.md` beside it; the user can
view and restore old versions from the page, and a restore is just another file
change, so read `draft.md` fresh before each edit. Add `.justmd/` to
`.gitignore` in repos.

## Print → PDF

```sh
npx justmd file.md -o file.html
/opt/google/chrome/chrome --headless --disable-gpu --no-sandbox \
  --no-pdf-header-footer --print-to-pdf=file.pdf file.html
```

`--out` is not a flag — the CLI accepts `-o` only. Output defaults to
`<input>.html`, so `-o` matters when writing elsewhere.

The `@media print` styles force a light print: all text black, backgrounds
removed, table borders drawn — so code spans and GFM tables stay legible in the
PDF. Verify by reading the PDF back (`pdftotext file.pdf - | head`, or rasterize
with `pdftoppm` and look at it) — extraction proves text, a raster proves
legibility. Not by file size or page count alone.

## Contract

- Output is a single `.html` file with zero external references (mermaid inlined,
  ~3.5 MB overhead). Send it anywhere — phone, chat attachment, air-gapped machine —
  and it renders identically.
- Prints the absolute output path on stdout; errors on stderr with non-zero exit.
- Reads only the input file; writes only the output file (and, with `--review`,
  `<file>.comments.md` and the `.justmd/` version folder). Safe for untrusted trees.

## Notes for agents

- The output path is deterministic (`<input>.html` unless `-o`), so you can chain it:
  `npx justmd report.md && xdg-open report.html`.
- Mermaid blocks (` ```mermaid `) render as diagrams; malformed diagrams show
  mermaid's error text — not a tool failure, a source error.
- If the file has no `# heading`, the output `<title>`/page header falls back to the
  input filename.
