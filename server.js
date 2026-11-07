const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        return { products: [], users: [], carts: {}, orders: [] };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Products API
app.get('/api/products', (req, res) => {
    res.json(readDB().products);
});

app.get('/api/products/:id', (req, res) => {
    const db = readDB();
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
});

// Auth API
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }
    const newUser = { name, email, password };
    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, user: { name: newUser.name, email: newUser.email } });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    // Check if user email exists
    const user = db.users.find(u => u.email === email);
    if (!user) {
        return res.status(400).json({ error: 'This email has no account' });
    }
    // Check if password matches
    if (user.password !== password) {
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    res.json({ success: true, user: { name: user.name, email: user.email } });
});

// Cart API
app.get('/api/cart/:userId', (req, res) => {
    const db = readDB();
    res.json(db.carts[req.params.userId] || []);
});

app.post('/api/cart/:userId', (req, res) => {
    const db = readDB();
    db.carts[req.params.userId] = req.body.cart;
    writeDB(db);
    res.json({ success: true });
});

// Orders API
app.post('/api/orders', (req, res) => {
    const { userId, items, total, shippingAddress } = req.body;
    const db = readDB();
    const newOrder = {
        id: 'RC-' + Math.floor(100000 + Math.random() * 900000),
        userId: userId || 'guest',
        items,
        total,
        shippingAddress,
        status: 'Processing',
        date: new Date().toISOString()
    };
    db.orders.unshift(newOrder);
    if (userId && db.carts[userId]) db.carts[userId] = [];
    writeDB(db);
    res.json({ success: true, order: newOrder });
});

app.get('/api/orders/:userId', (req, res) => {
    const db = readDB();
    res.json(db.orders.filter(o => o.userId === req.params.userId));
});

app.listen(PORT, () => {
    console.log(`RC TechMart Modular Server running at http://localhost:${PORT}`);
});