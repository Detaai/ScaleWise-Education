# ScaleWise Education CMS

This project now runs as a Node.js/Express site with a SQLite-backed admin CMS.
The original HTML pages were imported into `data/scalewise.db`, while the
original files are preserved in `legacy-static-backup/`.

## Run locally

1. Install Node.js 22.13 or newer (the server uses Node's built-in SQLite module).
2. Copy `.env.example` to `.env`.
3. Set a strong `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in
   `.env` before the first start.
4. Install dependencies:

   ```powershell
   npm.cmd install
   ```

5. Start the server:

   ```powershell
   npm.cmd start
   ```

Open `http://localhost:3000/` for the public site and
`http://localhost:3000/admin/login` for the CMS.

The initial admin account is created only when the SQLite database is first
created. Change its password immediately from **Admin > Account**.

## CMS features

### Public-page design

`css/site-theme.css` gives public pages the approved forest-green and gold
design, solid-green title panels, rounded cards, and consistent buttons.
The faded photo behind the opening text is reserved for the home page.
It is loaded by the static public pages and the CMS renderer, and exported
with publish packages. Admin layouts do not load it. Home-specific styling
lives in `css/home.css`; the approved home content is also stored in the CMS.

The crew cards use `js/home.js` to select a photo on each page load or
back/forward return, never on a timer. Each card stays matched to the animal
folder in its original image path, and avoids the previous visit's photo when
another is available. Add photos to `images/round-about/Animal 1/` (Charlie) or
`images/round-about/Animal 2/` (Mystery). Filenames can vary and numbering can
have gaps; PNG, JPG, JPEG, WebP, and GIF files are discovered automatically.
For Live Server development, run `npm.cmd run dev:photos` alongside Live Server.
It scans the folders every second and updates the generated photo list when
photos are added, renamed, or deleted. Refresh the page to see a new selection;
the watcher does not rotate photos while you are viewing the page.
Do not edit `images/round-about/manifest.json` manually.
The list is also regenerated automatically by `npm.cmd start`, `npm.cmd run build`,
`npm.cmd pack`, and the CMS publish-package export. For a static deployment,
run `npm.cmd run build` before uploading and include the generated manifest
alongside the photos. A deployed static site cannot discover files added after
the build without rebuilding and uploading the updated list.
An animal with only one photo keeps that photo. CMS and published pages also
support this behavior when their saved home content includes the crew cards;
editing `index.html` does not automatically update saved CMS content.

### Test home page

Open `http://localhost:3000/test-home.html` while the server is running to preview
the experimental home page. Edit `test-home.html` for content and
`css/test-home.css` for design changes; leave the shared `css/style.css`,
`js/script.js`, and animal images unchanged when experimenting.
The approved home-page design lives in `css/home.css`, which the test stylesheet
imports. Future experiments should use overrides in `css/test-home.css` without
editing `css/home.css`. The main page does not load the test stylesheet.
The test page is not linked from public navigation or included in the static
publish package. It requests search engines not to index it, but is not
password-protected. Approved changes must be applied to the main home page
separately; there is no automatic promotion.

- Edit page title, metadata, navigation label, and navigation order.
- Edit migrated page content as raw HTML blocks.
- Add, edit, delete, and reorder page-builder sections.
- Add hero banners, card grids, FAQ lists, image grids, and call-to-action bands.
- Upload images to `images/uploads/` and use their generated path in an image grid.
- Create and delete additional pages.
- Session-based admin login with bcrypt password hashing.
- Local PowerPoint library with an optional in-browser ONLYOFFICE viewer.
- Adoption portal with searchable animal listings, private enclosure-photo applications, tracking-code status lookup, and administrator listing/status management.

The public site keeps the original `.html` URLs, including `/index.html`, so
existing links continue to work. Pages are rendered dynamically from SQLite on
each request.

## Production notes

- Use a persistent filesystem for `data/scalewise.db`, `data/adoption-uploads/`, `images/uploads/`, and `images/adoptions/`.
- The adoption portal's applications and status lookup require the Node/SQLite server. The static GitHub Pages ZIP cannot receive applications or provide application-status lookups.
- Set `NODE_ENV=production`, a long random `SESSION_SECRET`, and a strong
  initial admin password.
- Put the Node process behind HTTPS and a reverse proxy such as IIS, nginx, or
  a managed Node host.
- The default Express session store is suitable for local development only.
  Use a persistent session store before running multiple production instances.
- Back up the SQLite database and uploaded images together.

Run the built-in smoke tests with:

```powershell
npm.cmd test
```

## In-browser PowerPoint viewer

The local admin can store `.ppt` and `.pptx` files under **PowerPoints**. To
open them inside the browser instead of launching the desktop app, install
Docker Desktop and start the included ONLYOFFICE container from the project
folder:

```powershell
docker compose -f docker-compose.onlyoffice.yml up -d
```

Then start the CMS and open **Admin > PowerPoints**. The presentation engine
is local and the original files remain outside the GitHub Pages publish
package.
