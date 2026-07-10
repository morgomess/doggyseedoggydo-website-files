# DSDD blog publishing (assisted trigger)

How an approved blog in the Content Marketing AIOS Airtable base
(`appLm4Zgt3H2vxKdj`, table **Generated Content**) gets onto doggyseedoggydo.com.
There is **no fully-automatic** blog path — the site is a Node generator and
GitHub pushes use Morgan's per-session token. Social pins auto-publish via the
Metricool worker; **blogs go through this routine instead.**

## The trigger
1. **Approve in Airtable.** Set a `Content Type = Blog`, `Brand = Doggy See, Doggy Do`
   record's **Approval Status = Approved**. (Do NOT set blogs to "Ready to Push" —
   that's the Metricool social path and a blog will just fail there.)
2. **Run the routine** (Claude, assisted):
   - Pull Approved DSDD blogs from Airtable (Generated Copy carries SEO Title,
     Slug, Meta Description, Hook, then body).
   - Convert each into the site's HTML (`<p class="lead">` intro, `<h2>` sections,
     `<ul>`, wire "Related:" mentions to real `/blog/<slug>/` links) and normalize
     to **US English** (source copy often comes back British/AU + Celsius).
   - Generate a hero image per post (`images/<name>.jpg`, ~1000x562) — or set
     `reuseImg` to an existing tag image as a fallback.
   - Write these into a manifest and run the injector (below).
   - Push to GitHub with Morgan's token (see [[github-powershell]] skill).
   - Write the live URL back to Airtable `Publishing Link` and set
     `Approval Status = Published`.

## The injector — `add-blogs.mjs`
Safely APPENDS posts to the three index-aligned lists (`blogPosts` + `postBodies`
in `build/source.html`, `SLUGS` in `build.mjs`), adds the `.blog-img-<name>` CSS
class, places the image, and runs `build.mjs`. Idempotent (skips existing slugs).

```
node add-blogs.mjs <manifest.json>          # inject + build
node add-blogs.mjs <manifest.json> --no-build
```

Manifest = JSON array; per-post fields: `slug, title, excerpt, tag, date, read,
emoji, img, bodyHtml`, plus optional `imageFrom` (copy a file to images/<img>.jpg)
or `reuseImg` (reuse an existing image name). `tag` must be one of:
Training, Nutrition, Health, Puppies, Seniors, Gear, Grooming.
`bodyHtml` must not contain a backtick or `${`.

A worked example (the two July 2026 blogs) lives in
`../dsdd-blog-staging/build-manifest.mjs` — it builds the manifest in readable JS
so you never hand-escape HTML.

## After building
- `node build.mjs` regenerates all pages + `sitemap.xml`.
- Commit `build/source.html`, `build.mjs`, `add-blogs.mjs`, the new
  `blog/<slug>/`, `images/<name>.jpg`, and every regenerated page, then push to
  `morgomess/doggyseedoggydo-website-files` (branch `main`). GitHub Pages serves it.
