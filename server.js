const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;
const DB_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let memoryDb = { users: [], videos: [] };
let isSaving = false;

async function loadDb() {
    try {
        const response = await fetch(DB_URL + '/latest', { headers: { 'X-Master-Key': API_KEY } });
        if (response.ok) {
            const data = await response.json();
            const db = data.record || {};
            memoryDb.users = db.users || [];
            memoryDb.videos = db.videos || [];
            
            //_seed initial data if empty
            if (memoryDb.users.length === 0) {
                memoryDb.users.push(
                    { username: "radin", password: "123", displayName: "رادین نبی پور", skill: "فوتبال", bio: "بازیکن و نمایشگر مهارت‌های فوتبال", avatar: "⚽" },
                    { username: "reza", password: "123", displayName: "رضا کریم پور", skill: "یو سی مس (UCMAS)", bio: "قهرمان ریاضیات ذهنی", avatar: "🧮" }
                );
                memoryDb.videos.push(
                    { id: "v1", uploader: "radin", title: "بهترین مهارت‌های فوتبال رادین", url: "https://www.w3schools.com/html/mov_bbb.mp4", likes: [], comments: [] },
                    { id: "v2", uploader: "reza", title: "نمایش قدرت ذهن در یو-سی-مس", url: "https://www.w3schools.com/html/movie.mp4", likes: [], comments: [] }
                );
                saveDb();
            }
            console.log("DB Loaded & Seeded!");
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

// Auth & User Update
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

// Video Actions
app.post('/api/video/upload', async (req, res) => {
    const { username, title, url } = req.body;
    let user = memoryDb.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let videoId = 'v_' + Date.now();
    memoryDb.videos.push({ id: videoId, uploader: username, title, url, likes: [], comments: [] });
    saveDb();
    res.json({ success: true, videoId });
});

app.post('/api/video/like', async (req, res) => {
    const { username, videoId } = req.body;
    let video = memoryDb.videos.find(v => v.id === videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    const index = video.likes.indexOf(username);
    if (index > -1) video.likes.splice(index, 1);
    else video.likes.push(username);
    
    saveDb();
    res.json({ success: true, likes: video.likes.length });
});

app.post('/api/video/comment', async (req, res) => {
    const { username, videoId, text } = req.body;
    let video = memoryDb.videos.find(v => v.id === videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    video.comments.push({ id: Date.now(), from: username, text, date: new Date().toLocaleTimeString('fa-IR') });
    if (video.comments.length > 50) video.comments.shift(); // max 50 comments
    saveDb();
    res.json({ success: true, comments: video.comments });
});

loadDb().then(() => {
    app.listen(PORT, () => console.log(`SkillArena Server running on ${PORT}`));
});
