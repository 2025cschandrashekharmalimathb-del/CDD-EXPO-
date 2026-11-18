import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const categories = ['All', 'Lab Equipment', 'Study Room', 'Study Material'];
const categoryIcons = { 'Lab Equipment': '⌁', 'Study Room': '▣', 'Study Material': '▤' };
const tokenKey = 'campus-session-token';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');
  const [authRole, setAuthRole] = useState('student');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', campusId: '', department: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Lab Equipment');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function handleAuthFailure() {
    localStorage.removeItem(tokenKey); setToken(''); setUser(null); setResources([]);
    setAuthError('Your session ended. Please sign in again.');
  }
  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/register') handleAuthFailure();
    if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
    return data;
  }
  useEffect(() => {
    if (!token) return;
    api('/api/auth/me').then((data) => { setUser(data.user); setAuthError(''); }).catch((err) => { setAuthError(err.message); });
  }, [token]);
  useEffect(() => {
    if (token && user) loadResources();
  }, [token, user]);

  async function loadResources() {
    setLoading(true); setError('');
    try { setResources(await api('/api/resources')); }
    catch (err) { setError(err.message || 'Could not connect to the campus database.'); }
    finally { setLoading(false); }
  }
  const filtered = useMemo(() => resources.filter((item) =>
    (filter === 'All' || item.category === filter) && item.name.toLowerCase().includes(search.trim().toLowerCase())
  ), [resources, filter, search]);
  const availableCount = resources.filter((item) => item.status === 'Available').length;
  const bookedCount = resources.length - availableCount;

  async function submitAuth(event) {
    event.preventDefault(); setAuthBusy(true); setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify({ ...authForm, role: authRole }) });
      localStorage.setItem(tokenKey, result.token); setToken(result.token); setUser(result.user); setNotice(`Welcome${authRole === 'lecturer' ? ', ' + result.user.name : ', ' + result.user.name}!`);
    } catch (err) { setAuthError(err.message || 'Could not connect to the server.'); }
    finally { setAuthBusy(false); }
  }
  function signOut() {
    localStorage.removeItem(tokenKey); setToken(''); setUser(null); setResources([]); setAuthForm({ name: '', email: '', password: '', campusId: '', department: '' });
  }
  async function toggleBooking(item) {
    setBusyId(item.id); setNotice(''); setError('');
    try {
      const data = await api(`/api/resources/${item.id}/book`, { method: 'POST', body: JSON.stringify({}) });
      setResources((items) => items.map((resource) => resource.id === item.id ? data : resource));
      setNotice(data.status === 'Booked' ? `${data.name} is reserved for you.` : `${data.name} has been returned.`);
    } catch (err) { setError(err.message || 'Booking could not be updated.'); }
    finally { setBusyId(null); }
  }
  async function addResource(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const data = await api('/api/resources', { method: 'POST', body: JSON.stringify({ name: newName.trim(), category: newCategory }) });
      setResources((items) => [...items, data]); setFilter('All'); setSearch(''); setNewName(''); setShowForm(false); setNotice(`${data.name} is now on the resource board.`);
    } catch (err) { setError(err.message || 'Could not add this resource.'); }
    finally { setSaving(false); }
  }
  function changeAuthRole(role) { setAuthRole(role); setAuthError(''); setAuthForm({ name: '', email: '', password: '', campusId: '', department: '' }); }
  const isLecturer = user?.role === 'lecturer';

  if (!user) return (
    <main className={`auth-page ${authRole === 'lecturer' ? 'auth-lecturer' : 'auth-student'}`}>
      <section className="auth-showcase">
        <a className="brand auth-brand" href="#" onClick={(event) => event.preventDefault()}><span className="brand-mark">C</span><span>campus<span className="brand-light">commons</span></span></a>
        <div className="auth-showcase-copy"><span className="auth-kicker">CAMPUS, CONNECTED</span><h1>{authRole === 'student' ? <>Make campus<br/><em>work for you.</em></> : <>Keep great<br/><em>work moving.</em></>}</h1><p>{authRole === 'student' ? 'Find a study spot, borrow the kit, share what helped. Your campus community starts here.' : 'Keep learning resources organized and help every student find what they need.'}</p><div className="auth-benefits">{(authRole === 'student' ? ['Reserve lab kits and study spaces', 'Discover notes shared by classmates', 'See availability before you make the trip'] : ['Publish resources for your classes', 'See what is being used across campus', 'Keep shared learning spaces organized']).map((benefit) => <div key={benefit}><span>✓</span>{benefit}</div>)}</div></div>
        <div className="showcase-decoration" aria-hidden="true"><div className="showcase-circle circle-one"/><div className="showcase-circle circle-two"/><div className="showcase-note">{authRole === 'student' ? 'LEARN TOGETHER' : 'TEACH. SHARE. INSPIRE.'}</div><span className="showcase-star">✳</span></div>
        <span className="auth-footer-caption">A little sharing goes a long way.</span>
      </section>
      <section className="auth-panel-wrap"><div className="auth-panel">
        <div className="account-toggle" aria-label="Choose account type"><button className={authRole === 'student' ? 'active' : ''} onClick={() => changeAuthRole('student')}><span>♙</span> Student</button><button className={authRole === 'lecturer' ? 'active' : ''} onClick={() => changeAuthRole('lecturer')}><span>▤</span> Lecturer</button></div>
        <div className="auth-heading"><div className="auth-role-label"><span className="live-dot"/>{authRole === 'student' ? 'STUDENT PORTAL' : 'FACULTY PORTAL'}</div><h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{authMode === 'login' ? 'Sign in to pick up where you left off.' : `Join Campus Commons as a ${authRole}.`}</p></div>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === 'register' && <><label htmlFor="auth-name">Full name</label><input id="auth-name" required maxLength={100} autoComplete="name" placeholder={authRole === 'student' ? 'e.g. Asha Kumar' : 'e.g. Dr. Arun Rao'} value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}/></>}
          <label htmlFor="auth-email">Campus email</label><input id="auth-email" required type="email" autoComplete="email" maxLength={190} placeholder="you@university.edu" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}/>
          {authMode === 'register' && <><label htmlFor="auth-campus-id">{authRole === 'student' ? 'Student ID' : 'Staff ID'}</label><input id="auth-campus-id" required maxLength={50} placeholder={authRole === 'student' ? 'Your student ID' : 'Your staff ID'} value={authForm.campusId} onChange={(e) => setAuthForm({ ...authForm, campusId: e.target.value })}/>{authRole === 'lecturer' && <><label htmlFor="auth-department">Department</label><input id="auth-department" required maxLength={100} placeholder="e.g. Computer Engineering" value={authForm.department} onChange={(e) => setAuthForm({ ...authForm, department: e.target.value })}/></>}</>}
          <label htmlFor="auth-password">Password</label><input id="auth-password" required type="password" minLength={8} maxLength={72} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder={authMode === 'register' ? 'At least 8 characters' : 'Enter your password'} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}/>
          {authError && <div className="auth-error" role="alert">{authError}</div>}
          <button className="auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? `Sign in as ${authRole}` : 'Create account'}<span>↗</span></button>
        </form>
        <div className="auth-switch">{authMode === 'login' ? 'New to Campus Commons?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
        <div className="auth-secure"><span>♢</span> Your account details are stored securely.</div>
      </div></section>
    </main>
  );

  return (
    <main className={`app-shell ${isLecturer ? 'lecturer-shell' : 'student-shell'}`}>
      <header className="app-header"><a className="brand" href="#top"><span className="brand-mark">C</span><span>campus<span className="brand-light">commons</span></span></a><div className="header-right"><span className={`role-chip ${isLecturer ? 'role-faculty' : ''}`}>{isLecturer ? 'FACULTY' : 'STUDENT'}</span><div className="profile-chip"><span className="profile-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="profile-name"><b>{user.name}</b><small>{isLecturer ? user.department : user.campusId}</small></span></div><button className="signout-button" onClick={signOut}>Sign out <span>↗</span></button></div></header>
      <div className="dashboard-wrap" id="top">
        <section className={`dashboard-welcome ${isLecturer ? 'welcome-lecturer' : 'welcome-student'}`}><div><div className="eyebrow"><span className="eyebrow-line"/>{isLecturer ? 'FACULTY RESOURCE DESK' : 'YOUR CAMPUS, SHARED'}</div><h1>{isLecturer ? <>Good morning, {user.name.split(' ')[0]}.</> : <>Welcome back, {user.name.split(' ')[0]}.</>}</h1><p>{isLecturer ? `Manage shared resources for ${user.department}. Keep the learning essentials in motion.` : 'Your next great study session starts with the right resources.'}</p></div><div className="welcome-symbol" aria-hidden="true">{isLecturer ? '▤' : '✳'}</div></section>
        {notice && <div className="notice" role="status"><span>✓</span>{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
        <section className="stats-row" aria-label="Resource summary"><div className="stat-card"><span className="stat-icon stat-indigo">◈</span><div><strong>{resources.length}</strong><span>shared resources</span></div></div><div className="stat-card"><span className="stat-icon stat-green">✓</span><div><strong>{availableCount}</strong><span>ready to reserve</span></div></div><div className="stat-card"><span className="stat-icon stat-peach">↗</span><div><strong>{bookedCount}</strong><span>currently in use</span></div></div></section>
        <section className="catalog" id="resources"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{isLecturer ? 'RESOURCE MANAGEMENT' : 'THE RESOURCE BOARD'}</div><h2>{isLecturer ? <>Your campus <em>inventory.</em></> : <>Find your next <em>aha.</em></>}</h2><p>{isLecturer ? 'See what is shared and add resources for your students.' : 'Campus essentials, shared by your community.'}</p></div>{isLecturer && <button className="outline-button add-desktop" onClick={() => setShowForm(true)}>＋ Add a resource</button>}</div>
          <div className="toolbar"><div className="filters" role="tablist" aria-label="Filter by category">{categories.map((category) => <button key={category} role="tab" aria-selected={filter === category} className={`filter-pill ${filter === category ? 'selected' : ''}`} onClick={() => setFilter(category)}>{category}</button>)}</div><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." aria-label="Search resources"/><kbd>⌕</kbd></label></div>
          {error && <div className="error-box" role="alert">{error}<button onClick={loadResources}>Retry</button></div>}
          {isLecturer && <div className="faculty-banner"><span>✦</span><div><b>Faculty view</b><small>Only lecturers can add new resources. Students manage their own reservations.</small></div></div>}
          {loading ? <div className="empty-state"><div className="loader"/><p>Gathering campus essentials…</p></div> : filtered.length === 0 ? <div className="empty-state"><span className="empty-icon">⌕</span><h3>No resources found</h3><p>Try another search or category.</p><button className="outline-button" onClick={() => { setSearch(''); setFilter('All'); }}>Clear filters</button></div> : <div className="resource-grid">{filtered.map((item, index) => { const available = item.status === 'Available'; const mine = Number(item.booked_by) === Number(user.id); return <article className="resource-card" key={item.id} style={{ animationDelay: `${index * 45}ms` }}><div className={`card-illustration illustration-${item.category === 'Lab Equipment' ? 'lab' : item.category === 'Study Room' ? 'room' : 'notes'}`}><span className="illustration-glyph">{categoryIcons[item.category] || '◈'}</span><span className="illustration-orb"/><span className="category-tag">{item.category}</span><span className={`status-tag ${available ? 'status-available' : 'status-booked'}`}><span/>{available ? 'Available' : 'In use'}</span></div><div className="card-body"><div className="card-title-row"><h3>{item.name}</h3><span className="card-arrow">↗</span></div>{available ? <p className="card-description">Ready for its next campus adventure.</p> : <p className="card-description">With <b>{item.booked_by_name || 'a student'}</b>{mine ? ' · your reservation' : ''}{item.booked_at ? ` · ${new Date(item.booked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</p>}{isLecturer ? <div className="lecturer-card-note">Added by {item.created_by_name || 'Campus Commons'}</div> : <button disabled={busyId === item.id || (!available && !mine)} className={`reserve-button ${!available ? 'release-button' : ''}`} onClick={() => toggleBooking(item)}>{busyId === item.id ? 'Updating…' : available ? 'Reserve this' : mine ? 'Return resource' : 'Reserved by another student'}<span>{available ? '↗' : mine ? '↩' : '•'}</span></button>}</div></article>; })}</div>}
        </section>
        <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark">C</span><span>campus<span className="brand-light">commons</span></span></a><span>{isLecturer ? 'Supporting every learner. ' : 'A little sharing goes a long way. '}<b>✳</b></span><a href="#top" className="back-top">Back to top ↑</a></footer>
      </div>
      {showForm && isLecturer && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><section className="resource-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button><div className="eyebrow"><span className="eyebrow-line"/> FACULTY RESOURCE DESK</div><h2 id="modal-title">Add a resource</h2><p className="modal-copy">Share a useful item with students across campus.</p><form onSubmit={addResource}><label htmlFor="resource-name">Resource name</label><input id="resource-name" autoFocus required maxLength={100} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Breadboard kit, Room A2…"/><label htmlFor="resource-category">Category</label><select id="resource-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Adding…' : 'Add to resource board ↗'}</button></div></form></section></div>}
    </main>
  );
}
export default App;
