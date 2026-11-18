const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '32kb' }));
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_tracker', waitForConnections: true,
  connectionLimit: 10, queueLimit: 0, dateStrings: false,
});
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const seedResources = [
  ['Arduino Uno R4 Kit', 'Lab Equipment'], ['Digital Oscilloscope #3', 'Lab Equipment'],
  ['Library Study Pod B2', 'Study Room'], ['Digital Logic Design Notes (Sem 3)', 'Study Material'],
];

async function initDB() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer') NOT NULL,
    campus_id VARCHAR(50) NOT NULL,
    department VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS resources (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('Lab Equipment', 'Study Room', 'Study Material') NOT NULL,
    status ENUM('Available', 'Booked') NOT NULL DEFAULT 'Available',
    booked_by INT UNSIGNED DEFAULT NULL,
    booked_at TIMESTAMP NULL DEFAULT NULL,
    created_by INT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resources_booked_by FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_resources_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_resource_status (status), INDEX idx_resource_category (category)
  ) ENGINE=InnoDB`);
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM resources');
  if (Number(count) === 0) {
    for (const [name, category] of seedResources) await pool.execute('INSERT INTO resources (name, category) VALUES (?, ?)', [name, category]);
  }
}

function createToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    req.user = { id: Number(claims.sub), role: claims.role };
    next();
  } catch { return res.status(401).json({ error: 'Your session expired. Please sign in again.' }); }
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next() : res.status(403).json({ error: 'This feature is available to a different account type.' });
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, campusId: user.campus_id, department: user.department || '' };
}

app.get('/api/health', (_req, res) => res.status(200).json({ status: 'OK', service: 'Campus Resource API', database: 'MySQL' }));
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, campusId, department } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanCampusId = typeof campusId === 'string' ? campusId.trim() : '';
  if (!cleanName || cleanName.length > 100) return res.status(400).json({ error: 'Enter your name (up to 100 characters).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 190) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!['student', 'lecturer'].includes(role)) return res.status(400).json({ error: 'Choose Student or Lecturer.' });
  if (!cleanCampusId || cleanCampusId.length > 50) return res.status(400).json({ error: role === 'student' ? 'Enter your student ID.' : 'Enter your staff ID.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  const cleanDepartment = typeof department === 'string' ? department.trim().slice(0, 100) : '';
  if (role === 'lecturer' && !cleanDepartment) return res.status(400).json({ error: 'Enter your department.' });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role, campus_id, department) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, role, cleanCampusId, role === 'lecturer' ? cleanDepartment : null]
    );
    const user = { id: result.insertId, name: cleanName, email: cleanEmail, role, campus_id: cleanCampusId, department: cleanDepartment };
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Registration failed:', error.message);
    res.status(500).json({ error: 'Account could not be created.' });
  }
});
app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.role;
  if (!email || !password || !['student', 'lecturer'].includes(role)) return res.status(400).json({ error: 'Enter your email and password, and choose your account type.' });
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows.length || rows[0].role !== role || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email, password, or account type did not match.' });
    }
    res.json({ token: createToken(rows[0]), user: publicUser(rows[0]) });
  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, role, campus_id, department FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(401).json({ error: 'Account not found. Please sign in again.' });
    res.json({ user: publicUser(rows[0]) });
  } catch (error) { res.status(500).json({ error: 'Unable to load your account.' }); }
});

app.get('/api/resources', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT r.*, borrower.name AS booked_by_name, owner.name AS created_by_name
      FROM resources r LEFT JOIN users borrower ON borrower.id = r.booked_by
      LEFT JOIN users owner ON owner.id = r.created_by ORDER BY r.id ASC`);
    res.json(rows);
  } catch (error) { console.error('Unable to load resources:', error.message); res.status(500).json({ error: 'Unable to load resources.' }); }
});
app.post('/api/resources', requireAuth, requireRole('lecturer'), async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
  const allowed = ['Lab Equipment', 'Study Room', 'Study Material'];
  if (!name || name.length > 100) return res.status(400).json({ error: 'Name is required and must be 100 characters or fewer.' });
  if (!allowed.includes(category)) return res.status(400).json({ error: 'Choose a valid resource category.' });
  try {
    const [result] = await pool.execute('INSERT INTO resources (name, category, created_by) VALUES (?, ?, ?)', [name, category, req.user.id]);
    const [rows] = await pool.execute('SELECT r.*, NULL AS booked_by_name, u.name AS created_by_name FROM resources r JOIN users u ON u.id = r.created_by WHERE r.id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) { console.error('Unable to create resource:', error.message); res.status(500).json({ error: 'Unable to add this resource.' }); }
});
app.post('/api/resources/:id/book', requireAuth, requireRole('student'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Resource ID must be a positive integer.' });
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT * FROM resources WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ error: 'Resource not found.' }); }
    const resource = rows[0];
    if (resource.status === 'Booked' && Number(resource.booked_by) !== req.user.id) {
      await connection.rollback(); return res.status(409).json({ error: 'This resource is reserved by another student.' });
    }
    if (resource.status === 'Available') {
      await connection.execute("UPDATE resources SET status = 'Booked', booked_by = ?, booked_at = NOW() WHERE id = ?", [req.user.id, id]);
    } else {
      await connection.execute("UPDATE resources SET status = 'Available', booked_by = NULL, booked_at = NULL WHERE id = ?", [id]);
    }
    await connection.commit();
    const [updated] = await pool.execute(`SELECT r.*, borrower.name AS booked_by_name, owner.name AS created_by_name
      FROM resources r LEFT JOIN users borrower ON borrower.id = r.booked_by
      LEFT JOIN users owner ON owner.id = r.created_by WHERE r.id = ?`, [id]);
    res.json(updated[0]);
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Unable to update booking:', error.message); res.status(500).json({ error: 'Unable to update this booking.' });
  } finally { if (connection) connection.release(); }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  initDB().then(() => app.listen(port, () => console.log(`Campus Commons API listening on ${port}`)))
    .catch((error) => { console.error('MySQL initialization failed. Check XAMPP and DB settings:', error.message); process.exit(1); });
}
module.exports = { app, initDB, pool, requireAuth };
