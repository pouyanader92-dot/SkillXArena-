const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;
const DB_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let memoryDb = { users: [] };
let isSaving = false;

async function loadDb() {
    try {
        const response = await fetch(DB_URL + '/latest', { headers: { 'X-Master-Key': API_KEY } });
        if (response.ok) {
            const data = await response.json();
            memoryDb.users = data.record?.users || [];
        }
    } catch (e) { console.error("Load DB Error:", e.message); }
}

async function saveDb() {
    if(isSaving) return;
    isSaving = true;
    try {
        await fetch(DB_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
            body: JSON.stringify(memoryDb)
        });
    } catch (e) { console.error('Save DB Error:', e.message); }
    isSaving = false;
}

app.get('/api/db', async (req, res) => res.json(memoryDb));
app.post('/api/db', async (req, res) => { memoryDb = req.body; saveDb(); res.json({ success: true }); });

app.post('/api/auth', async (req, res) => {
    const { username, password, displayName, skill } = req.body;
    let user = memoryDb.users.find(u => u.username === username);
    if (!user) {
        if (!displayName || !password) return res.status(400).json({ error: 'اطلاعات ناقص است' });
        user = { username, password, displayName, skill: skill || 'عمومی', bio: '', avatar: '👤' };
        memoryDb.users.push(user);
        saveDb();
        res.json({ success: true, user });
    } else {
        if (user.password !== password) return res.status(400).json({ error: 'رمز اشتباه است' });
        res.json({ success: true, user });
    }
});

app.post('/api/user/update', async (req, res) => {
    const { username, data } = req.body;
    let user = memoryDb.users.find(u => u.username === username);
    if (user) {
        Object.assign(user, data);
        saveDb();
        res.json({ success: true, user });
    } else res.status(404).json({ error: 'User not found' });
});

loadDb().then(() => {
    app.listen(PORT, () => console.log(`SkillArena Server running on ${PORT}`));
});
