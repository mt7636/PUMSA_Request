async function callApi(action, payload) {
  if (!BACKEND_URL || BACKEND_URL.indexOf('PASTE_YOUR') === 0) {
    throw new Error('The site is not connected to a backend yet. See SETUP.md.');
  }
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight request, which Apps Script can't answer.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action }, payload)),
  });
  if (!res.ok) throw new Error('Network error talking to the backend.');
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---- Session helpers (kept in sessionStorage: cleared when the tab closes) ----

const Session_ = {
  setMember(code, name) {
    sessionStorage.setItem('pumsa_member_code', code);
    sessionStorage.setItem('pumsa_member_name', name);
    sessionStorage.removeItem('pumsa_admin');
  },
  getMember() {
    const code = sessionStorage.getItem('pumsa_member_code');
    const name = sessionStorage.getItem('pumsa_member_name');
    return code ? { code, name } : null;
  },
  setAdmin(username, password) {
    sessionStorage.setItem('pumsa_admin', JSON.stringify({ username, password }));
    sessionStorage.removeItem('pumsa_member_code');
  },
  getAdmin() {
    const raw = sessionStorage.getItem('pumsa_admin');
    return raw ? JSON.parse(raw) : null;
  },
  logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
  },
  requireMember() {
    const m = this.getMember();
    if (!m) window.location.href = 'index.html';
    return m;
  },
  requireAdmin() {
    const a = this.getAdmin();
    if (!a) window.location.href = 'index.html';
    return a;
  },
};
