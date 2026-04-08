import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { fileURLToPath } from 'url';
import { initDb, runQuery, getQuery, allQuery } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure database is created/migrated
initDb();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { path: '/api/socket.io', cors: { origin: '*' } });
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'super-secret-mvp-key';

app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Web Push VAPID Generation
const vapidPath = path.resolve(__dirname, 'vapid.json');
let vapidKeys;
if (fs.existsSync(vapidPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
}
webpush.setVapidDetails('mailto:admin@skrr.store', vapidKeys.publicKey, vapidKeys.privateKey);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ======================== AUTH & PROFILE ========================
app.post('/api/auth/signup', async (req, res) => {
  const { login_id, password } = req.body;
  if (!login_id || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const existing = await getQuery(`SELECT id FROM users WHERE login_id = ?`, [login_id]);
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const result = await runQuery(`INSERT INTO users (login_id, password_hash) VALUES (?, ?)`, [login_id, hash]);
    
    res.json({ success: true, message: 'Signup complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { login_id, password } = req.body;
  try {
    const user = await getQuery(`SELECT * FROM users WHERE login_id = ?`, [login_id]);
    if (!user) return res.status(400).json({ error: 'Invalid login' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid login' });

    const token = jwt.sign({ id: user.id, login_id }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery(`SELECT id, login_id, profile_name, profile_image FROM users WHERE id = ?`, [req.user.id]);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/profile', authenticateToken, upload.single('image'), async (req, res) => {
  const { profile_name } = req.body;
  let image_url = req.body.existing_image; // Allows keeping old image

  if (req.file) {
    image_url = `/uploads/${req.file.filename}`;
  }

  try {
    await runQuery(`UPDATE users SET profile_name = ?, profile_image = ? WHERE id = ?`, [profile_name, image_url, req.user.id]);
    const updated = await getQuery(`SELECT id, login_id, profile_name, profile_image FROM users WHERE id = ?`, [req.user.id]);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== PRODUCTS ========================
app.get('/api/products', async (req, res) => {
  try {
    const products = await allQuery(`
      SELECT p.*, u.profile_name as seller_name, u.profile_image as seller_image,
             (SELECT COUNT(*) FROM product_likes WHERE product_id = p.id) as likes
      FROM products p 
      JOIN users u ON p.seller_id = u.id 
      ORDER BY p.created_at DESC
    `);
    
    products.forEach(p => {
      p.images = JSON.parse(p.images || '[]');
      p.seller = { name: p.seller_name, image: p.seller_image };
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { title, description, price, isQuick } = req.body;
  const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

  try {
    const r = await runQuery(
      `INSERT INTO products (seller_id, title, description, price, is_quick, images) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, price, isQuick === 'true' ? 1 : 0, JSON.stringify(images)]
    );
    res.json({ id: r.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { title, description, price, isQuick, existingImages } = req.body;
  
  try {
    const p = await getQuery(`SELECT seller_id, images FROM products WHERE id = ?`, [req.params.id]);
    if (!p || String(p.seller_id) !== String(req.user.id)) return res.status(403).json({error: 'Forbidden'});
    
    let combinedImages = JSON.parse(existingImages || '[]');
    if (req.files && req.files.length > 0) {
      combinedImages = [...combinedImages, ...req.files.map(f => `/uploads/${f.filename}`)];
    }
    
    await runQuery(
      `UPDATE products SET title=?, description=?, price=?, is_quick=?, images=? WHERE id=?`,
      [title, description, price, isQuick === 'true' ? 1 : 0, JSON.stringify(combinedImages), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const p = await getQuery(`SELECT seller_id FROM products WHERE id = ?`, [req.params.id]);
    if (!p || String(p.seller_id) !== String(req.user.id)) return res.status(403).json({error: 'Forbidden'});
    
    await runQuery(`DELETE FROM products WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== PRODUCT WISHLIST ========================
app.post('/api/products/:id/like', authenticateToken, async (req, res) => {
  try {
    const existing = await getQuery(`SELECT * FROM product_likes WHERE product_id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (existing) {
      await runQuery(`DELETE FROM product_likes WHERE product_id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    } else {
      await runQuery(`INSERT INTO product_likes (product_id, user_id) VALUES (?, ?)`, [req.params.id, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/likes', authenticateToken, async (req, res) => {
  try {
    const likes = await allQuery(`SELECT product_id FROM product_likes WHERE user_id = ?`, [req.user.id]);
    res.json(likes.map(l => l.product_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== COMMUNITY ========================
app.get('/api/community/posts', async (req, res) => {
  try {
    const posts = await allQuery(`
      SELECT p.*, u.profile_name as author_name, u.profile_image as author_image 
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      ORDER BY p.created_at DESC
    `);
    
    // Attach comments count and format
    for (let p of posts) {
      p.author = { name: p.author_name, image: p.author_image };
      p.comments = await allQuery(`
        SELECT c.*, u.profile_name as author_name, u.profile_image as author_image 
        FROM comments c 
        JOIN users u ON c.author_id = u.id 
        WHERE c.post_id = ?
      `, [p.id]);
      p.comments.forEach(c => {
         c.author = { name: c.author_name, image: c.author_image };
      });
    }
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts', authenticateToken, async (req, res) => {
  const { title, content, category } = req.body;
  try {
    await runQuery(`INSERT INTO posts (author_id, title, content, category) VALUES (?, ?, ?, ?)`, [req.user.id, title, content, category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts/:id/like', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  try {
    // Basic toggle
    const existing = await getQuery(`SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?`, [postId, req.user.id]);
    if (existing) {
      await runQuery(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`, [postId, req.user.id]);
      await runQuery(`UPDATE posts SET likes = likes - 1 WHERE id = ?`, [postId]);
    } else {
      await runQuery(`INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`, [postId, req.user.id]);
      await runQuery(`UPDATE posts SET likes = likes + 1 WHERE id = ?`, [postId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts/:id/comment', authenticateToken, async (req, res) => {
  try {
    await runQuery(`INSERT INTO comments (post_id, author_id, text) VALUES (?, ?, ?)`, [req.params.id, req.user.id, req.body.text]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/community/likes', authenticateToken, async (req, res) => {
  try {
    const likes = await allQuery(`SELECT post_id FROM post_likes WHERE user_id = ?`, [req.user.id]);
    res.json(likes.map(l => l.post_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CHAT ========================
app.post('/api/chat/room', authenticateToken, async (req, res) => {
  const { product_id, seller_id } = req.body;
  const buyer_id = req.user.id;
  try {
    if (buyer_id === parseInt(seller_id)) return res.status(400).json({ error: 'Cannot chat with yourself' });
    
    let room = await getQuery(`SELECT * FROM chat_rooms WHERE product_id = ? AND buyer_id = ? AND seller_id = ?`, [product_id, buyer_id, seller_id]);
    if (!room) {
      const r = await runQuery(`INSERT INTO chat_rooms (product_id, buyer_id, seller_id) VALUES (?, ?, ?)`, [product_id, buyer_id, seller_id]);
      room = { id: r.lastID };
    }
    res.json({ roomId: room.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await allQuery(`
      SELECT cr.*, 
             p.title as product_title, p.images as product_images,
             u_buyer.profile_name as buyer_name, u_buyer.profile_image as buyer_image,
             u_seller.profile_name as seller_name, u_seller.profile_image as seller_image,
             (SELECT text FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
             (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND sender_id != ? AND is_read = 0) as unread_count
      FROM chat_rooms cr
      JOIN products p ON cr.product_id = p.id
      JOIN users u_buyer ON cr.buyer_id = u_buyer.id
      JOIN users u_seller ON cr.seller_id = u_seller.id
      WHERE cr.buyer_id = ? OR cr.seller_id = ?
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id]);
    
    rooms.forEach(r => {
      r.product_images = JSON.parse(r.product_images || '[]');
      r.is_buyer = r.buyer_id === req.user.id;
      r.partner_name = r.is_buyer ? r.seller_name : r.buyer_name;
      r.partner_image = r.is_buyer ? r.seller_image : r.buyer_image;
    });
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/read/:roomId', authenticateToken, async (req, res) => {
  try {
    await runQuery(`UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ?`, [req.params.roomId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/message', authenticateToken, async (req, res) => {
  const { room_id, text } = req.body;
  const senderId = req.user.id;
  try {
    const r = await runQuery(`INSERT INTO chat_messages (room_id, sender_id, text) VALUES (?, ?, ?)`, [room_id, senderId, text]);
    const newMsg = await getQuery(`
      SELECT cm.*, u.profile_name, u.profile_image, cr.buyer_id, cr.seller_id,
             cr.product_id
      FROM chat_messages cm 
      JOIN users u ON cm.sender_id = u.id 
      JOIN chat_rooms cr ON cm.room_id = cr.id
      WHERE cm.id = ?
    `, [r.lastID]);
    
    const targetUserId = (Number(newMsg.buyer_id) === Number(senderId)) ? newMsg.seller_id : newMsg.buyer_id;
    
    io.to(`room_${room_id}`).emit('receiveMessage', newMsg);
    io.to(`user_${targetUserId}`).emit('receiveMessage', newMsg);
    
    // Push notification (reusing logic or calling a helper is better, but doing it directly for now)
    const subscriptions = await allQuery(`SELECT * FROM push_subscriptions WHERE user_id = ?`, [targetUserId]);
    const pushPayload = JSON.stringify({
      title: `New Message from ${newMsg.profile_name}`,
      body: text,
      icon: newMsg.profile_image || '/favicon.svg',
      url: `/chat/${room_id}`
    });
    for (let sub of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pushPayload);
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) await runQuery(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [sub.endpoint]);
      }
    }
    
    res.json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/messages/:roomId', authenticateToken, async (req, res) => {
  try {
    const messages = await allQuery(`
      SELECT cm.*, u.profile_name, u.profile_image 
      FROM chat_messages cm 
      JOIN users u ON cm.sender_id = u.id 
      WHERE room_id = ? ORDER BY created_at ASC
    `, [req.params.roomId]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== PUSH NOTIFICATIONS ========================
app.get('/api/notifications/public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  const subscription = req.body;
  try {
    await runQuery(
      `INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)`,
      [req.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSockets (Chat & Push dispatch fallback)
io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId) => {
    socket.join(`room_${roomId}`);
  });

  socket.on('identify', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('sendMessage', async (data) => {
    const { roomId, senderId, text } = data;
    try {
      const r = await runQuery(`INSERT INTO chat_messages (room_id, sender_id, text) VALUES (?, ?, ?)`, [roomId, senderId, text]);
      const newMsg = await getQuery(`
        SELECT cm.*, u.profile_name, u.profile_image, cr.buyer_id, cr.seller_id,
               cr.product_id
        FROM chat_messages cm 
        JOIN users u ON cm.sender_id = u.id 
        JOIN chat_rooms cr ON cm.room_id = cr.id
        WHERE cm.id = ?
      `, [r.lastID]);
      
      const targetUserId = (Number(newMsg.buyer_id) === Number(senderId)) ? newMsg.seller_id : newMsg.buyer_id;
      
      io.to(`room_${roomId}`).emit('receiveMessage', newMsg);
      io.to(`user_${targetUserId}`).emit('receiveMessage', newMsg);
      
      // Target User Push Execution
      const subscriptions = await allQuery(`SELECT * FROM push_subscriptions WHERE user_id = ?`, [targetUserId]);
      
      const pushPayload = JSON.stringify({
        title: `New Message from ${newMsg.profile_name}`,
        body: text,
        icon: newMsg.profile_image || '/favicon.svg',
        url: `/chat/${roomId}`
      });

      for (let sub of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, pushPayload);
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
             await runQuery(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [sub.endpoint]);
          }
        }
      }

    } catch (e) {
      console.error('WS Error:', e);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Backend API serving on http://localhost:${PORT}`);
});
