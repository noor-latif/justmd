#!/usr/bin/env node
// justmd — render markdown to a self-contained HTML file (GFM tables, mermaid diagrams).
// Usage: justmd <file.md> [-o out.html] [--open | --review]
//   Default: writes <file>.html next to the input; prints the path.
//   --open   also opens the result with the platform opener (xdg-open/open/start).
//   --review serves the page on 127.0.0.1 with select-to-comment; comments are
//            written to <file>.comments.md and the process exits on "Send to AI".
import { ready, parse } from "markdown-wasm";
import hljs from "highlight.js/lib/common";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const require_ = createRequire(import.meta.url);

// Backdrop art lifted from the carrd dark template: parallax mountain range at 3%
// opacity, tiled repeat-x behind a fixed 152deg gradient.
const MOUNTAINS = encodeURIComponent(`<svg width="640" height="480" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"> <style> :root { opacity: 0.03; } path { fill: #FFFFFF; stroke: none; stroke-width: 0; vector-effect: non-scaling-stroke; } path.z0 { fill: #808080 } path.z1 { fill: #a1a1a1 } path.z2 { fill: #c2c2c2 } path.z3 { fill: #e3e3e3 } </style> <path d="m 0,0 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 0,480 l -800,0" transform="translate(0,123.4286)" class="z0"> <animateTransform attributeName="transform" type="translate" values="0 123.4286;-160 123.4286" dur="15000ms" repeatCount="indefinite"></animateTransform> </path> <path d="m 0,0 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 0,480 l -960,0" transform="translate(0,180.5714)" class="z1"> <animateTransform attributeName="transform" type="translate" values="0 180.5714;-320 180.5714" dur="15000ms" repeatCount="indefinite"></animateTransform> </path> <path d="m 0,30 l 20,-45 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-45 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,15 l 0,450 l -1280,0" transform="translate(0,237.7143)" class="z2"> <animateTransform attributeName="transform" type="translate" values="0 237.7143;-640 237.7143" dur="15000ms" repeatCount="indefinite"></animateTransform> </path> <path d="m 0,0 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 0,480 l -1920,0" transform="translate(0,294.8571)" class="z3"> <animateTransform attributeName="transform" type="translate" values="0 294.8571;-1280 294.8571" dur="15000ms" repeatCount="indefinite"></animateTransform> </path> <path d="m 0,60 l 20,-45 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-45 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-45 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-45 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-45 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 20,-15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,15 l 20,-15 l 20,-15 l 20,-15 l 20,15 l 20,15 l 20,15 l 20,-15 l 20,15 l 20,15 l 0,420 l -3200,0" transform="translate(0,352)" class="z4"> <animateTransform attributeName="transform" type="translate" values="0 352;-2560 352" dur="15000ms" repeatCount="indefinite"></animateTransform> </path></svg>`);

// Fine grain over the card, so the panel reads as a surface and not a flat fill.
const NOISE = encodeURIComponent(`<svg viewBox="0 0 512 512" width="512" height="512" xmlns="http://www.w3.org/2000/svg"> <filter id="noise"> <feTurbulence type="fractalNoise" baseFrequency="0.875" result="noise" /> <feColorMatrix type="matrix" values="0.2421875 0 0 0 0 0 0.28125 0 0 0 0 0 0.37890625 0 0 0 0 0 0.05859375 0" /> </filter> <rect filter="url(#noise)" x="0" y="0" width="512" height="512" fill="transparent" opacity="1" /></svg>`);

// Typography is the design here, so the two faces ship inside the HTML rather
// than resolving through whatever the reader happens to have installed.
const FONTS = ["Inter", "Bricolage Grotesque"].map((family, i) => {
  const file = ["inter.woff2", "bricolage.woff2"][i];
  const b64 = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fonts", file)).toString("base64");
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}).join("\n");

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- Without this, mobile browsers lay out at ~980px and zoom out; this is what
     makes the page readable at its natural size on a phone. -->
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="generator" content="justmd">
<title>__TITLE__</title>
<style>
__FONTS__
:root{
  color-scheme:dark;
  --bg:#1E1C2A;--panel:rgba(255,255,255,.028);--border:rgba(255,255,255,.11);--hair:rgba(255,255,255,.07);
  --text:rgba(255,255,255,.6);--strong:rgba(255,255,255,.82);--heading:#fff;
  --link:#E97FC0;--magenta:#A82E75;--blue:#3076A7;
  /* Line length is capped at ~80 characters (accessibility guidance) and kept
     under that for prose comfort. */
  --measure:72ch;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scrollbar-color:rgba(255,255,255,.22) transparent}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{
  color:var(--text);background-color:var(--bg);
  background-image:linear-gradient(152deg,#311E2F 14%,#152031 55%,#14161D 96%);
  background-attachment:fixed;min-height:100svh;margin:0;padding:0;
  /* rem, not px, so the reader's browser font-size preference is honored */
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:1.0625rem;line-height:1.7;
  /* Normalizes the fallback's x-height to Inter's, so the swap is visually stable */
  font-size-adjust:from-font;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  overflow-wrap:break-word;
}
body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background-image:url("data:image/svg+xml,${MOUNTAINS}");background-size:auto 100%;background-position:center;background-repeat:repeat-x}
header,main{position:relative;z-index:1}
header{max-width:var(--measure);margin:0 auto;padding:3.5rem 1.25rem 1.25rem;text-align:center}
header .dash{display:inline-block;width:3rem;height:7px;border-radius:30px;background-color:var(--magenta);background-image:linear-gradient(90deg,var(--blue) 0%,rgba(168,46,117,.012) 100%);margin-bottom:1.75rem}
header h1{margin:0;font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif;font-size:clamp(1.75rem,4.2vw,2.85rem);font-weight:300;line-height:1.15;letter-spacing:-.025rem;color:var(--heading);text-wrap:balance}
main{max-width:var(--measure);margin:0 auto;padding:0 1.25rem 4rem;container-type:inline-size}
article{position:relative;border:1px solid var(--border);border-radius:1rem;background-color:var(--panel);background-image:url("data:image/svg+xml,${NOISE}");padding:clamp(1.5rem,4vw,3.5rem);box-shadow:0 1rem 4rem -1.5rem rgba(0,0,0,.8);margin-top:1.5rem}
article>:first-child{margin-top:0}article>:last-child{margin-bottom:0}
h1,h2,h3,h4{color:var(--heading);font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif;font-weight:300;line-height:1.25;letter-spacing:-.025rem;text-wrap:balance}
h2{margin:2.5em 0 .75em;font-size:1.75rem}
h3{margin:2em 0 .5em;font-size:1.3rem}
h4{margin:1.75em 0 .4em;font-size:1.075rem}
/* Prose wraps with the prettier algorithm where supported; ignored otherwise */
p,li,blockquote,dd,figcaption{text-wrap:pretty}
p{margin:1.25em 0;text-align:start}
strong,b{color:var(--strong);font-weight:600}
a{color:var(--link);text-decoration:none;position:relative;transition:color .15s ease}
a::before,a::after{position:absolute;content:"";left:0;bottom:-.1rem;display:block;width:100%;height:1px;background:currentColor;transition:1.1s cubic-bezier(.19,1,.22,1)}
a::before{transform:scaleX(0);transform-origin:left}
a::after{transform-origin:right;transition-delay:.25s}
a:hover,a:focus-visible{color:#fff}
a:hover::before,a:focus-visible::before{transform:scaleX(1);transition-delay:.25s}
a:hover::after,a:focus-visible::after{transform:scaleX(0);transition-delay:0s}
:focus-visible{outline:2px solid var(--link);outline-offset:2px;border-radius:2px}
code{font-family:'Lucida Console','Courier New',ui-monospace,monospace;font-size:.9em;background:rgba(144,144,144,.25);border-radius:.25em;margin:0 .25em;padding:.2em .45em;color:var(--strong)}
.prewrap{position:relative;overflow-x:auto;border:1px solid var(--border);border-radius:.5rem;background:rgba(0,0,0,.32);margin:1.5em 0;max-width:100%;container-type:scroll-state;-webkit-overflow-scrolling:touch}
pre{background:none;border:none;border-radius:0;padding:1.25rem 1.4rem;overflow:visible;white-space:pre;line-height:1.7;font-size:.9em;margin:0}
pre code{background:none;padding:0;margin:0;border-radius:0;font-size:100%;color:inherit}
blockquote{margin:1.75em 0;padding-left:2.25rem;position:relative;color:var(--strong);font-style:italic}
blockquote::before{content:"//";position:absolute;left:0;top:.05em;color:var(--link);opacity:.85;font-size:1em;font-style:normal;font-weight:600;letter-spacing:-.12em;line-height:1.7}
blockquote::after{content:"";position:absolute;left:3px;top:1.7em;bottom:0;width:1px;background:currentColor;opacity:.25}
blockquote p{margin:0}blockquote p+p{margin-top:1rem}
blockquote>:first-child{margin-top:0}blockquote>:last-child{margin-bottom:0}
blockquote blockquote::before,blockquote blockquote::after{display:none}
blockquote blockquote{border-left:1px solid var(--hair);padding-left:1.25rem}
.hljs-comment,.hljs-quote{color:rgba(255,255,255,.6);font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-doctag{color:#E97FC0}
.hljs-string,.hljs-regexp,.hljs-addition{color:#9FE0B6}
.hljs-number,.hljs-symbol,.hljs-bullet{color:#F5B77C}
.hljs-title,.hljs-section,.hljs-name{color:#93C0F0}
.hljs-attr,.hljs-attribute,.hljs-variable,.hljs-template-variable,.hljs-selector-class,.hljs-selector-id{color:#D6B0F0}
.hljs-type,.hljs-built_in,.hljs-title.class_{color:#7FD6E4}
.hljs-operator,.hljs-punctuation,.hljs-meta,.hljs-link{color:#AECBE8}
.hljs-tag,.hljs-deletion,.hljs-selector-pseudo{color:#F0879C}
.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}
hr{border:none;width:3rem;height:7px;border-radius:30px;background-color:var(--magenta);background-image:linear-gradient(90deg,var(--blue) 0%,rgba(168,46,117,.012) 100%);margin:3rem 0}
article img{max-width:100%;height:auto;border-radius:.5rem}
article ul,article ol{padding-left:1.3em;margin:1.25em 0}
article li:not(:last-child){margin-bottom:.4em}
article li::marker{color:var(--link)}
article header{text-align:left;padding:0;border:none;background:none;margin-bottom:2rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.45)}
/* Horizontal scrollers: tables and code. Scroll-state queries add edge fades so
   the overflow is discoverable instead of silently clipped. */
.tblwrap{overflow-x:auto;border:1px solid var(--border);border-radius:.5rem;margin:1.5em 0;background:rgba(0,0,0,.2);position:relative;container-type:scroll-state;-webkit-overflow-scrolling:touch}
.tblwrap::after{content:"";position:sticky;right:0;top:0;display:block;width:2.5rem;height:100%;margin-left:-2.5rem;pointer-events:none;opacity:0;transition:opacity .2s;background:linear-gradient(to right,rgba(20,22,29,0),rgba(20,22,29,.9))}
@container scroll-state(scrollable:inline-end){.tblwrap::after{opacity:1}}
.prewrap::after{content:"";position:sticky;right:0;top:0;display:block;width:2.5rem;height:100%;margin-left:-2.5rem;pointer-events:none;opacity:0;transition:opacity .2s;background:linear-gradient(to right,rgba(10,11,14,0),rgba(10,11,14,.95))}
@container scroll-state(scrollable:inline-end){.prewrap::after{opacity:1}}
table{border-collapse:collapse;width:100%;font-size:.95em}
th,td{border:none;border-bottom:1px solid var(--hair);padding:.7em .9em;text-align:left;vertical-align:top}
tr:last-child td{border-bottom:none}
th{background:rgba(255,255,255,.04);color:var(--heading);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;font-weight:500;text-wrap:nowrap}
tr:nth-child(even) td{background:rgba(255,255,255,.015)}
td code,th code{margin:0}
.tblwrap::-webkit-scrollbar,pre::-webkit-scrollbar,.mermaid::-webkit-scrollbar{height:8px;width:8px}
.tblwrap::-webkit-scrollbar-track,pre::-webkit-scrollbar-track,.mermaid::-webkit-scrollbar-track{background:transparent;border-radius:4px}
.tblwrap::-webkit-scrollbar-thumb,pre::-webkit-scrollbar-thumb,.mermaid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:4px}
.tblwrap:hover::-webkit-scrollbar-thumb,pre:hover::-webkit-scrollbar-thumb,.mermaid:hover::-webkit-scrollbar-thumb{background:rgba(255,255,255,.38)}
.mermaid{background:rgba(0,0,0,.32);border:1px solid var(--border);border-radius:.5rem;padding:1.5rem;text-align:center;overflow-x:auto;margin:1.5em 0;max-width:100%}
.mermaid .edgeLabel,.mermaid .edgeLabel p,.mermaid .edgeLabel foreignObject div{background:transparent!important;color:var(--strong)}
.mermaid .edgeLabel rect{fill:transparent!important;opacity:0!important}
.mermaid .labelBkg{background:transparent!important}
.mermaid .edgePath .path,.mermaid .flowchart-link{stroke:var(--link);stroke-width:2px}
.mermaid marker path,.mermaid .marker{fill:var(--link)!important;stroke:var(--link)!important}
.mermaid .node rect,.mermaid .node polygon,.mermaid .node circle,.mermaid .node path{stroke-width:1.5px}
.mermaid .cluster rect{fill:rgba(255,255,255,.04)!important;stroke:rgba(255,255,255,.11)!important}

/* Component-level scaling: type and spacing track the card's own width, so the
   same card works full-bleed or in a narrow column. Clamped so the max stays
   within 2.5x the min, preserving the reader's zoom. */
@supports (font-size:1cqi){
  @container (max-width:34rem){
    article{padding:1.5rem 1.25rem}
    h2{font-size:1.5rem}h3{font-size:1.2rem}h4{font-size:1.05rem}
    pre{padding:1rem 1.1rem;font-size:.85em}
    blockquote{padding-left:1.75rem}
    .mermaid{padding:1rem}
  }
}
/* Page-level mobile: keep the body copy at full size (never shrink below 1rem),
   trim the chrome, and let the card breathe edge to edge. */
@media (max-width:40rem){
  body{font-size:1.0625rem;line-height:1.65}
  header{padding:2.5rem 1.25rem 1rem}
  header h1{font-size:clamp(1.6rem,7.5vw,2.25rem)}
  main{padding:0 .875rem 3rem}
  article{padding:1.35rem 1.1rem;border-radius:.75rem;margin-top:1rem}
  h2{font-size:1.45rem;margin-top:2em}
  h3{font-size:1.2rem}
  h4{font-size:1.05rem}
  blockquote{padding-left:1.6rem}
  pre{padding:1rem;border-radius:.4rem;font-size:.85em}
  .mermaid{padding:.75rem}
  table{font-size:.9em}
  th,td{padding:.6em .7em}
  hr{margin:2.25rem 0}
  /* Comfortable touch targets */
  a{padding:.15em 0}
}
/* The theme is already low-contrast by design; reinforce the boundaries for
   readers who ask for more. */
@media (prefers-contrast:more){
  :root{--text:rgba(255,255,255,.85);--strong:#fff;--border:rgba(255,255,255,.4);--hair:rgba(255,255,255,.25)}
  code{background:rgba(144,144,144,.45)}
  .tblwrap,pre,.mermaid{border-color:rgba(255,255,255,.35)}
}
/* The backdrop is a CSS background image, so its SVG animation never runs;
   this covers the transitions we do author. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  a::before,a::after{transition:none}
  a::after{transform:scaleX(1)}
}
@media print{
  /* ponytail: blanket light print — every dark-theme color and background
     is overridden at * level; per-element rules would always miss one. */
  *,*::before,*::after,::marker{color:#000!important;background:transparent!important;
    box-shadow:none!important;text-shadow:none!important}
  html,body{background:#fff!important}
  body::before{display:none}
  article{border:none;padding:0}
  td,th{border:1px solid #999!important}
  a{text-decoration:underline}
}
</style>
<script>__MERMAID__</script>
<script>
mermaid.initialize({startOnLoad:true,theme:'base',securityLevel:'loose',flowchart:{useMaxWidth:false,htmlLabels:true,curve:'basis'},themeVariables:{darkMode:true,background:'transparent',primaryColor:'#2A2136',primaryTextColor:'#ffffff',primaryBorderColor:'#DE5DA8',secondaryColor:'#3A2A44',tertiaryColor:'#1B1724',lineColor:'#A82E75',textColor:'#ffffff',mainBkg:'#2A2136',nodeBorder:'#DE5DA8',nodeTextColor:'#ffffff',clusterBkg:'rgba(255,255,255,.04)',clusterBorder:'rgba(255,255,255,.11)',defaultLinkColor:'#A82E75',titleColor:'#ffffff',edgeLabelBackground:'transparent',labelBackground:'transparent',fontSize:'16px',fontFamily:"'Inter',system-ui,sans-serif"}});
</script>
</head>
<body>
<header><span class="dash" aria-hidden="true"></span><h1>__TITLE__</h1></header>
<main><article>
__BODY__
</article></main>
</body>
</html>
`;

// Review mode UI. Injected only into the page served by --review, never into
// the written .html, so the static output stays script-free apart from mermaid.
const REVIEW_CSS = `
::highlight(justmd-comment){background:rgba(233,127,192,.3);color:#fff}
.jm-add,.jm-pop{position:absolute;z-index:10}
.jm-add[hidden],.jm-pop[hidden],.jm-list[hidden]{display:none!important}
.jm-add{display:grid;place-items:center;width:2.25rem;height:2.25rem;padding:0;border-radius:50%;border:1px solid var(--border);background:#2A2136;color:var(--link);cursor:pointer;box-shadow:0 .5rem 1.5rem -.5rem rgba(0,0,0,.8)}
.jm-add:hover{color:#fff;background:var(--magenta)}
.jm-pop,.jm-dock{background:#221F2E;border:1px solid var(--border);border-radius:.75rem;box-shadow:0 1rem 3rem -1rem rgba(0,0,0,.9);font-size:.9rem;line-height:1.5}
.jm-pop{width:min(26rem,calc(100vw - 1.5rem));padding:1rem;display:grid;gap:.75rem}
.jm-pop label{display:grid;gap:.3rem;color:var(--strong)}
.jm-pop small{color:var(--text)}
.jm-pop textarea{font:inherit;color:#fff;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:.5rem;padding:.5rem .6rem;resize:vertical}
.jm-quote{margin:0;max-height:6em;overflow:auto;font-size:.85rem}
.jm-row{display:flex;gap:.5rem;justify-content:flex-end;align-items:center}
.jm-pop button,.jm-dock button{font:inherit;font-size:.85rem;white-space:nowrap;border-radius:999px;padding:.4rem .9rem;border:1px solid var(--border);background:transparent;color:var(--strong);cursor:pointer}
.jm-pop button[type=submit],.jm-send{background:var(--magenta)!important;border-color:var(--magenta)!important;color:#fff!important}
.jm-dock{position:fixed;right:1rem;bottom:1rem;z-index:12;max-width:calc(100vw - 2rem);padding:.5rem .5rem .5rem .75rem}
.jm-hint{color:var(--text);white-space:nowrap}
.jm-list{width:min(22rem,calc(100vw - 3.5rem));margin:0 0 .6rem;padding:0 0 0 1.2em;max-height:40vh;overflow:auto}
.jm-list li{margin:.5rem 0;cursor:pointer}
.jm-list q{color:var(--strong)}
.jm-list .jm-del{float:right;padding:0 .5rem;border:none;color:var(--text)}
@media print{.jm-add,.jm-pop,.jm-dock{display:none!important}}
`;

// Runs in the browser (stringified below), so it may only use DOM APIs.
function reviewClient() {
  const art = document.querySelector("article");
  const comments = [];
  const ranges = new Map();
  let seq = 0, pending = null, sent = false;
  const hl = window.Highlight && CSS.highlights ? new Highlight() : null;
  if (hl) CSS.highlights.set("justmd-comment", hl);

  const add = document.createElement("button");
  add.type = "button"; add.className = "jm-add"; add.hidden = true;
  add.setAttribute("aria-label", "Comment on selection");
  add.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>';
  const pop = document.createElement("form");
  pop.className = "jm-pop"; pop.hidden = true;
  pop.innerHTML = '<blockquote class="jm-quote"></blockquote>'
    + '<label>Comment<textarea name="comment" rows="3"></textarea></label>'
    + '<label>Replace with <small>edit to suggest new text</small><textarea name="replace" rows="3"></textarea></label>'
    + '<div class="jm-row"><button type="button" data-act="cancel">Cancel</button><button type="submit">Save</button></div>';
  const dock = document.createElement("div");
  dock.className = "jm-dock";
  dock.innerHTML = '<ol class="jm-list" hidden></ol><div class="jm-row"><button type="button" class="jm-count">0 comments</button><span class="jm-hint">Select text to comment</span><button type="button" class="jm-send">Send to AI</button></div>';
  document.body.append(add, pop, dock);
  const list = dock.querySelector(".jm-list"), count = dock.querySelector(".jm-count"), hint = dock.querySelector(".jm-hint");
  const fComment = pop.elements.comment, fReplace = pop.elements.replace;

  const selected = () => {
    const s = getSelection();
    if (sent || !s.rangeCount || s.isCollapsed || !s.toString().trim()) return null;
    const r = s.getRangeAt(0);
    return art.contains(r.commonAncestorContainer) ? r : null;
  };
  const placeBelow = (node, rect) => {
    node.style.top = rect.bottom + scrollY + 8 + "px";
    node.style.left = Math.max(12, Math.min(rect.left + scrollX, document.documentElement.clientWidth - node.offsetWidth - 12 + scrollX)) + "px";
  };
  // The icon sits just above the end of the selection, where the pointer let go.
  const showAdd = () => {
    const r = selected();
    if (!r || !pop.hidden) { add.hidden = true; return; }
    const rects = r.getClientRects(), end = rects[rects.length - 1] || r.getBoundingClientRect();
    add.hidden = false;
    add.style.top = end.top + scrollY - add.offsetHeight - 6 + "px";
    add.style.left = Math.min(end.right + scrollX - add.offsetWidth / 2, document.documentElement.clientWidth + scrollX - add.offsetWidth - 8) + "px";
  };
  document.addEventListener("pointerup", (e) => { if (!add.contains(e.target) && !pop.contains(e.target)) setTimeout(showAdd); });
  document.addEventListener("keyup", (e) => { if (e.shiftKey || e.key === "Shift") showAdd(); });
  add.addEventListener("pointerdown", (e) => e.preventDefault()); // keep the selection alive
  add.addEventListener("click", () => {
    const r = selected();
    if (!r) return;
    pending = r.cloneRange();
    const quote = r.toString();
    pop.querySelector(".jm-quote").textContent = quote;
    fComment.value = "";
    fReplace.value = quote;
    add.hidden = true;
    pop.hidden = false;
    placeBelow(pop, r.getBoundingClientRect());
    fComment.focus();
  });
  const close = () => { pop.hidden = true; pending = null; };
  pop.querySelector("[data-act=cancel]").addEventListener("click", close);
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) pop.requestSubmit();
  });
  pop.addEventListener("submit", (e) => {
    e.preventDefault();
    const quote = pending.toString(), comment = fComment.value.trim(), replace = fReplace.value;
    const changed = replace !== quote;
    if (!comment && !changed) { fComment.focus(); return; }
    const c = { id: ++seq, quote, comment, replace: changed ? replace : "" };
    comments.push(c);
    ranges.set(c.id, pending);
    if (hl) hl.add(pending);
    getSelection().removeAllRanges();
    close();
    render();
    sync("comments");
  });

  const render = () => {
    count.textContent = comments.length + (comments.length === 1 ? " comment" : " comments");
    hint.hidden = comments.length > 0;
    list.replaceChildren(...comments.map((c) => {
      const li = document.createElement("li");
      const q = document.createElement("q");
      q.textContent = c.quote.length > 80 ? c.quote.slice(0, 80) + "…" : c.quote;
      const del = document.createElement("button");
      del.type = "button"; del.className = "jm-del"; del.textContent = "×";
      del.setAttribute("aria-label", "Delete comment");
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        comments.splice(comments.indexOf(c), 1);
        if (hl) hl.delete(ranges.get(c.id));
        ranges.delete(c.id);
        render();
        sync("comments");
      });
      li.append(del, q, document.createElement("br"), c.replace ? "→ " + c.replace : "", c.replace && c.comment ? " · " : "", c.comment);
      li.addEventListener("click", () => ranges.get(c.id).startContainer.parentElement.scrollIntoView({ block: "center", behavior: "smooth" }));
      return li;
    }));
  };
  count.addEventListener("click", () => { list.hidden = !list.hidden || !comments.length; });

  const sync = (what) => fetch(what, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(comments) });
  dock.querySelector(".jm-send").addEventListener("click", async (e) => {
    e.target.disabled = true;
    const res = await sync("done").catch(() => null);
    if (!res || !res.ok) { e.target.disabled = false; hint.hidden = false; hint.textContent = "Could not reach justmd"; return; }
    sent = true;
    add.hidden = true; close();
    dock.querySelector(".jm-row").replaceChildren("Sent " + count.textContent + ". You can close this tab.");
  });
}


const args = process.argv.slice(2);
if (!args.length || args.includes("-h") || args.includes("--help")) {
  console.error("usage: justmd <file.md> [-o out.html] [--open | --review]");
  process.exit(args.length ? 0 : 1);
}
const doOpen = args.includes("--open");
const doReview = args.includes("--review");
const oIdx = args.indexOf("-o");
const outPath = oIdx >= 0 ? args[oIdx + 1] : null;
const input = args.find((a, i) => !a.startsWith("-") && args[i - 1] !== "-o");
if (!input) { console.error("error: no input file"); process.exit(1); }

const md = readFileSync(input, "utf8");

// md4c/wasm GFM render — same parser family as md2html
const body = await ready.then(() => parse(md, "github"));

// --- post-process: mermaid blocks + table wrappers + title extraction ---
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function unesc(s) { return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"); }

let txt = body
  .replace(/<pre><code class="language-mermaid">(.*?)<\/code><\/pre>/gs,
    (_, code) => `<div class="mermaid">${unesc(code)}</div>`)
  // highlight at render time: output carries the spans, no client JS, nothing fetched at view time
  .replace(/<pre><code(?: class="language-([\w+#.-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (m, lang, code) =>
    lang && hljs.getLanguage(lang)
      ? `<pre><code class="hljs language-${lang}">${hljs.highlight(unesc(code), { language: lang }).value}</code></pre>`
      : m)
  .replace(/<table>.*?<\/table>/gs, (m) => `<div class="tblwrap">${m}</div>`)
  // Code blocks scroll like tables, so they get the same wrapper to hang the
  // scroll affordance off (a ::after inside `white-space:pre` lands on the next
  // line instead of the right edge).
  .replace(/<pre>/g, '<div class="prewrap"><pre>')
  .replace(/<\/pre>/g, "</pre></div>");

const h1 = txt.match(/<h1>([\s\S]*?)<\/h1>/);
// markdown-wasm injects heading anchors; md4c CLI doesn't — strip to plain text for the title
const title = h1
  ? h1[1].replace(/<a\b[^>]*>.*?<\/a>/gs, "").replace(/<[^>]+>/g, "").trim()
  : input.replace(/\.md$/i, "");
if (h1) txt = txt.slice(0, h1.index) + txt.slice(h1.index + h1[0].length);

// inline mermaid from node_modules — no network at view time
const mermaidJs = readFileSync(join(dirname(require_.resolve("mermaid/package.json")), "dist", "mermaid.min.js"), "utf8")
  .replace(/<\/script/gi, "<\\/script");

const html = TEMPLATE
  .replaceAll("__TITLE__", esc(unesc(title)))
  .replace("__FONTS__", () => FONTS)
  .replace("__MERMAID__", () => mermaidJs)
  .replace("__BODY__", () => txt);

const out = resolve(outPath || input.replace(/\.(md|markdown)$/i, "") + ".html"); // absolute: openers treat relative paths as URLs
writeFileSync(out, html);
console.log(out);

function openWith(target) {
  const spec = process.platform === "darwin" ? ["open", [target]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", target]]
    : ["xdg-open", [target]];
  const child = spawn(spec[0], spec[1], { stdio: "ignore", detached: true });
  child.on("error", () => console.error(`note: could not run ${spec[0]}; open ${target} manually`));
  child.unref();
}

if (doOpen && !doReview) openWith(out);

if (doReview) {
  const commentsPath = out.replace(/\.html$/i, "") + ".comments.md";
  const end = html.lastIndexOf("</body>");
  const page = html.slice(0, end) + `<style>${REVIEW_CSS}</style>\n<script>(${reviewClient})()</script>\n` + html.slice(end);

  // Point each comment at its source line: compare with markdown syntax stripped.
  const plain = (s) => s.replace(/\]\([^)]*\)|[*_`~[\]]|<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const mdLines = md.split("\n").map(plain);
  const lineOf = (quote) => {
    const probe = plain(quote.split("\n").find((l) => l.trim()) || "").slice(0, 40);
    return probe ? mdLines.findIndex((l) => l.includes(probe)) + 1 : 0;
  };
  const quoted = (s) => s.split("\n").map((l) => `> ${l}`.trimEnd()).join("\n");
  const printed = new Set();
  const save = (list) => {
    const items = list.map((c, i) => {
      const line = lineOf(c.quote);
      if (!printed.has(c.id)) {
        printed.add(c.id);
        console.log(`comment ${c.id}${line ? ` (line ${line})` : ""}: ${(c.comment || "replace text").slice(0, 80)}`);
      }
      return [`## ${i + 1}${line ? ` · line ${line}` : ""}`, quoted(c.quote),
        c.replace && `**Replace with:**\n\n${quoted(c.replace)}`,
        c.comment && `**Comment:** ${c.comment}`].filter(Boolean).join("\n\n");
    });
    writeFileSync(commentsPath, [`# Review comments: ${basename(input)}`, ...items].join("\n\n") + "\n");
  };

  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url.split("?")[0] === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(page);
    }
    // A JSON content type forces a CORS preflight, which this server never
    // answers, so other origins in the browser cannot post comments.
    if (req.method !== "POST" || !["/comments", "/done"].includes(req.url) || req.headers["content-type"] !== "application/json") {
      return res.writeHead(404).end();
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1e6) return res.writeHead(413).end();
    }
    let list;
    try { list = JSON.parse(body); } catch { return res.writeHead(400).end(); }
    if (!Array.isArray(list)) return res.writeHead(400).end();
    save(list.map((c) => ({ id: Number(c.id) || 0, quote: String(c.quote ?? ""), comment: String(c.comment ?? ""), replace: String(c.replace ?? "") })));
    if (req.url === "/done") {
      res.on("finish", () => { console.log(`done: ${list.length} comment(s) in ${commentsPath}`); process.exit(0); });
    }
    res.writeHead(204).end();
  });
  server.listen(0, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    console.log(`review: ${url}`);
    console.log(`comments: ${commentsPath}`);
    openWith(url);
  });
}

// --- chrome: xmit.dev-derived theme; tables/scrollbars in the same idiom ---
