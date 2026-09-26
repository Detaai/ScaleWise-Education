// Minimal shared chrome for the /admin CMS UI.
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminLayout({ title, body, flash }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} | ScaleWise Admin</title>
<style>
  :root { --green:#2f5d3a; --bg:#f6f7f3; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, Arial, sans-serif; margin:0; background:var(--bg); color:#222; }
  header.admin-bar { background:var(--green); color:#fff; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  header.admin-bar a { color:#fff; text-decoration:none; margin-right:16px; font-weight:600; }
  header.admin-bar form { display:inline; }
  main.admin-main { max-width:960px; margin:24px auto; padding:0 16px 60px; }
  .card { background:#fff; border:1px solid #ddd; border-radius:8px; padding:20px; margin-bottom:20px; }
  h1 { font-size:1.6rem; } h2 { font-size:1.25rem; }
  label { display:block; font-weight:600; margin:12px 0 4px; }
  input[type=text], input[type=password], input[type=number], input[type=email], textarea, select {
    width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-family:inherit; font-size:0.95rem;
  }
  textarea { min-height:90px; font-family: Consolas, Menlo, monospace; }
  textarea.tall { min-height:220px; }
  .btn { display:inline-block; background:var(--green); color:#fff; border:none; padding:9px 16px; border-radius:6px; cursor:pointer; font-size:0.95rem; text-decoration:none; }
  .btn.secondary { background:#666; }
  .btn.danger { background:#a33; }
  .btn.small { padding:5px 10px; font-size:0.85rem; }
  .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .muted { color:#666; font-size:0.85rem; }
  .flash { background:#e7f4e8; border:1px solid #2f5d3a; color:#2f5d3a; padding:10px 14px; border-radius:6px; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:8px; border-bottom:1px solid #eee; }
  .section-block { border:1px dashed #bbb; border-radius:8px; padding:16px; margin-bottom:16px; }
  .section-block h3 { margin-top:0; }
  .pill { display:inline-block; background:#eef2ea; color:#2f5d3a; border-radius:12px; padding:2px 10px; font-size:0.75rem; font-weight:600; text-transform:uppercase; }
</style>
</head>
<body>
<header class="admin-bar">
  <div><a href="/admin">ScaleWise Admin</a><a href="/admin/powerpoints">PowerPoints</a><a href="/" target="_blank">View Site &#8599;</a></div>
  <div><a href="/admin/account">Account</a>
    <form method="post" action="/admin/logout" style="display:inline"><button class="btn small secondary" type="submit">Log out</button></form>
  </div>
</header>
<main class="admin-main">
  ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ''}
  ${body}
</main>
</body>
</html>`;
}

module.exports = { adminLayout, escapeHtml };
