# ScaleWise Education CMS

This project now runs as a Node.js/Express site with a SQLite-backed admin CMS.
The original HTML pages were imported into `data/scalewise.db`, while the
original files are preserved in `legacy-static-backup/`.

## Run locally

1. Install Node.js 18 or newer.
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

- Edit page title, metadata, navigation label, and navigation order.
- Edit migrated page content as raw HTML blocks.
- Add, edit, delete, and reorder page-builder sections.
- Add hero banners, card grids, FAQ lists, image grids, and call-to-action bands.
- Upload images to `images/uploads/` and use their generated path in an image grid.
- Create and delete additional pages.
- Session-based admin login with bcrypt password hashing.

The public site keeps the original `.html` URLs, including `/index.html`, so
existing links continue to work. Pages are rendered dynamically from SQLite on
each request.

## Production notes

- Use a persistent filesystem for `data/scalewise.db` and `images/uploads/`.
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
