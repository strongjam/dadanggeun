import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { Home, Search, MessageCircle, User as UserIcon, PlusCircle, Camera, Check, ArrowLeft, LogOut, Users, Heart, Send, ChevronLeft, ChevronRight, Edit2, Globe, ShoppingBag, Eye, EyeOff, Shield, Sparkles, MoreHorizontal, X } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = '/api';

// ========== CUSTOM HOOKS ==========

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user); else logout(); })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (login_id, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
  };
  
  const signup = async (login_id, password) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login_id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    return data.message || 'Success';
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (formData) => {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formData
    });
    const data = await res.json();
    if (data.user) setUser(data.user);
  };

  return { user, token, loading, login, signup, logout, updateProfile };
}

function useProducts(token) {
  const [products, setProducts] = useState([]);
  const [myProductLikes, setMyProductLikes] = useState([]);

  const fetchProducts = () => {
    fetch(`${API_BASE}/products`)
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(e => console.error(e));
  };

  const fetchMyProductLikes = async () => {
    if (!token) return setMyProductLikes([]);
    try {
      const res = await fetch(`${API_BASE}/products/likes`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) setMyProductLikes(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchProducts(); fetchMyProductLikes(); }, [token]);

  const addProduct = async (formData) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
    });
    if (!res.ok) throw new Error('Product upload failed.');
    fetchProducts();
  };

  const updateProduct = async (id, formData) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formData
    });
    if (!res.ok) throw new Error('Product update failed.');
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete product.');
    fetchProducts();
  };

  const toggleProductLike = async (id) => {
    await fetch(`${API_BASE}/products/${id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchProducts();
    fetchMyProductLikes();
  };

  const bumpProduct = async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}/bump`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to bump product.');
    fetchProducts();
  };

  const updateProductStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/products/${id}/status`, {
      method: 'PUT', headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status.');
    fetchProducts();
  };

  return { products, myProductLikes, fetchProducts, addProduct, updateProduct, deleteProduct, toggleProductLike, bumpProduct, updateProductStatus };
}

function useCommunity(token) {
  const [posts, setPosts] = useState([]);
  const [myLikes, setMyLikes] = useState([]);

  const fetchPosts = () => {
    fetch(`${API_BASE}/community/posts`)
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(e => console.error(e));
  };

  const fetchMyLikes = async () => {
    if (!token) return setMyLikes([]);
    try {
      const res = await fetch(`${API_BASE}/community/likes`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        setMyLikes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchPosts(); fetchMyLikes(); }, [token]);

  const addPost = async (postData) => {
    const res = await fetch(`${API_BASE}/community/posts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(postData)
    });
    if (res.ok) fetchPosts();
  };

  const toggleLike = async (id) => {
    await fetch(`${API_BASE}/community/posts/${id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchPosts();
    fetchMyLikes();
  };

  const addComment = async (id, text) => {
    const res = await fetch(`${API_BASE}/community/posts/${id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text })
    });
    if (res.ok) fetchPosts();
  };

  return { posts, myLikes, fetchPosts, addPost, toggleLike, addComment };
}

function useChat(token, user) {
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchRooms = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/chat/rooms`, { headers: { Authorization: `Bearer ${token}` }});
    if (res.ok) setRooms(await res.json());
  };

  const fetchMessages = async (roomId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/chat/messages/${roomId}`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        console.log(`Fetched ${data.length} messages for room ${roomId}`);
        setMessages(data);
      } else {
        console.error(`Failed to fetch messages: ${res.status}`);
      }
    } catch (e) {
      console.error("Fetch Messages Error:", e);
    }
  };

  const createRoom = async (productId, sellerId) => {
    const res = await fetch(`${API_BASE}/chat/room`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, seller_id: sellerId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Cannot chat with seller');
    }
    const data = await res.json();
    return data.roomId;
  };

  useEffect(() => {
    if (!token || !user) return;
    fetchRooms();
    const newSocket = io(window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin, { 
      path: '/api/socket.io',
      transports: ['websocket', 'polling'] 
    });
    setSocket(newSocket);
    newSocket.emit('identify', user.id);

    newSocket.on('receiveMessage', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const now = Date.now();
        const optIndex = prev.findIndex(m => 
          m.isOptimistic && 
          Number(m.sender_id) === Number(msg.sender_id) && 
          m.text === msg.text &&
          (Math.abs(now - new Date(m.created_at).getTime()) < 10000)
        );
        if (optIndex !== -1) {
          const updated = [...prev];
          updated[optIndex] = msg;
          return updated;
        }
        return [...prev, msg];
      });
      fetchRooms();
      
      if (user && msg.sender_id !== user.id && !window.location.pathname.startsWith(`/chat/${msg.room_id}`)) {
        setNotification({ text: msg.text, name: msg.profile_name || 'User', roomId: msg.room_id, image: msg.profile_image });
        setTimeout(() => setNotification(null), 4000);
      }
    });

    return () => newSocket.disconnect();
  }, [token, user]);

  const joinRoom = async (roomId) => {
    fetchMessages(roomId);
    await fetch(`${API_BASE}/chat/read/${roomId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchRooms();
    if (socket) {
      socket.emit('joinRoom', roomId);
    }
  };

  const sendMessage = async (roomId, text) => {
    if (!user || !token) return;
    
    // Optimistic UI Update
    const tempId = `opt-${Date.now()}`;
    const optimisticMsg = { 
      id: tempId, 
      room_id: roomId, 
      sender_id: user.id, 
      text, 
      created_at: new Date().toISOString(),
      profile_name: user.profile_name, 
      profile_image: user.profile_image,
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const useSocket = socket && socket.connected;
    if (useSocket) {
      socket.emit('sendMessage', { roomId, senderId: user.id, text });
    } else {
      console.log("Socket not connected, falling back to REST API for sendMessage");
      await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_id: roomId, text })
      });
    }
    fetchRooms();
  };

  return { rooms, messages, fetchRooms, createRoom, joinRoom, sendMessage, notification, setNotification };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function usePushNotifications(token, user) {
  useEffect(() => {
    if (!token || !user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const res = await fetch(`${API_BASE}/notifications/public-key`);
        const { publicKey } = await res.json();
        
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }).catch(err => {
          if (err.name === 'InvalidStateError') return registration.pushManager.getSubscription();
          throw err;
        });

        if (pushSubscription) {
          await fetch(`${API_BASE}/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(pushSubscription)
          });
        }
      } catch (e) {
        if (e.name !== 'InvalidStateError') {
          console.warn('Push setup notice:', e.message);
        }
      }
    };
    registerPush();
  }, [token, user]);
}

// ========== SHARED UI ==========
function Header({ title, rightContent, showBack }) {
  const navigate = useNavigate();
  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.0rem' }}>
        {showBack ? (
          <div onClick={() => navigate(-1)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={24} color="#1A202C" />
          </div>
        ) : (
          <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={24} color="var(--primary)" />
            Dadang_geun
          </Link>
        )}
        {title && showBack && <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{title}</div>}
      </div>
      <div style={{fontWeight: '600', display: 'flex', alignItems: 'center', gap: '1rem'}}>
        {rightContent}
      </div>
    </header>
  );
}

function BottomNav({ user, rooms = [] }) {
  const location = useLocation();
  const path = location.pathname;
  
  const isCommunityDetail = path.startsWith('/community/') && path !== '/community/new';
  const isChatRoom = path.startsWith('/chat/');
  if (path.startsWith('/product/') || isCommunityDetail || isChatRoom || path === '/login') return null;

  const totalUnread = rooms.reduce((acc, r) => acc + (r.unread_count || 0), 0);

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}><Home size={24} /><span>Home</span></Link>
      <Link to={user ? "/chats" : "/login"} className={`nav-item ${path.startsWith('/chats') ? 'active' : ''}`}>
        <div style={{ position: 'relative' }}>
          <MessageCircle size={24} />
          {totalUnread > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-8px', background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 'bold' }}>{totalUnread}</span>}
        </div>
        <span>Chats</span>
      </Link>
      <Link to="/community" className={`nav-item ${path === '/community' ? 'active' : ''}`}><Users size={24} /><span>Community</span></Link>
      <Link to={user ? "/profile" : "/login"} className={`nav-item ${path === '/profile' ? 'active' : ''}`}><UserIcon size={24} /><span>Profile</span></Link>
    </nav>
  );
}

// ========== PAGES ==========
function LoginPage({ login, signup }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleTestLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login('testuser', 'test1234');
      navigate('/');
    } catch (err) {
      if (err.message.includes('Invalid login')) {
        try {
          await signup('testuser', 'test1234');
          await login('testuser', 'test1234');
          navigate('/');
        } catch (e2) {
          setError('Failed to log in as Test User.');
        }
      } else {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(loginId, password);
        navigate('/');
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await signup(loginId, password);
        alert('Sign up complete! Please login.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Header title={isLogin ? "Login" : "Sign Up"} />
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          {error && <div style={{ background: '#FED7D7', color: '#C53030', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username (ID)</label>
              <input type="text" className="form-input" value={loginId} onChange={e => setLoginId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <div 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group slide-in">
                <label className="form-label">Confirm Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginBottom: '1rem' }}>{isLogin ? "Login" : "Sign Up"}</button>
            <button type="button" onClick={handleTestLogin} className="btn-primary" style={{ marginBottom: '1.5rem', background: '#3182CE', boxShadow: 'none' }}>Quick Test Login</button>
            
            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setConfirmPassword('');
              }} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                {isLogin ? "Sign up here" : "Login here"}
              </span>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function ProfilePage({ user, logout, updateProfile, products, myProductLikes, chatRooms = [] }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.profile_name || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profile_image || '');

  if (!user) return <Navigate to="/login" />;

  const wishlistProducts = products.filter(p => myProductLikes.includes(p.id));
  const sellingProducts = products.filter(p => String(p.seller_id) === String(user.id));
  const buyingRooms = (chatRooms || []).filter(r => String(r.buyer_id) === String(user.id));

  const handleImageChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('profile_name', name);
    formData.append('existing_image', user.profile_image || '');
    if (file) formData.append('image', file);

    await updateProfile(formData);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  return (
    <>
      <Header title="My Profile" />
      <main>
        {isEditing ? (
          <div className="glass-card">
             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
               <ArrowLeft size={24} onClick={() => setIsEditing(false)} style={{ cursor: 'pointer', marginRight: '1rem' }} />
               <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Edit Profile</h2>
             </div>
             <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <input type="file" accept="image/*" id="profilePic" onChange={handleImageChange} style={{ display: 'none' }} />
                <label htmlFor="profilePic" style={{ cursor: 'pointer', position: 'relative' }}>
                  {preview ? <img src={preview} className="profile-img" style={{ width: '100px', height: '100px' }} /> : <div className="profile-placeholder" style={{ width: '100px', height: '100px' }}><Camera size={40} /></div>}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}><Camera size={16} /></div>
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">Nickname</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Please set your nickname" required />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Done</button>
            </form>
          </div>
        ) : (
          <div className="profile-dashboard">
            <div className="glass-card" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', border: '1px solid #F1F5F9' }}>
              {user.profile_image ? (
                <img src={user.profile_image} className="profile-avatar-large" alt={user.profile_name} />
              ) : (
                <div className="profile-avatar-large" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={48} color="#94A3B8" />
                </div>
              )}
              <div className="profile-nickname-huge">{user.profile_name || 'Anonymous'}</div>
              <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
            </div>

            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Selling Section */}
              <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                <div className="profile-section-header" style={{ marginTop: 0 }}>
                  <div className="profile-section-title">
                    Selling <span className="profile-section-count">{sellingProducts.length}</span>
                  </div>
                  <div className="profile-section-link" onClick={() => navigate('/profile/sales')} style={{ cursor: 'pointer' }}><ChevronRight size={20} /></div>
                </div>
                
                {sellingProducts.length > 0 ? (
                  <div className="horizontal-scroll-row" style={{ marginTop: '0.5rem' }}>
                    {sellingProducts.map(p => (
                      <Link to={`/product/${p.id}`} key={p.id} className="mini-product-card">
                        <div className="mini-product-image-container">
                          {(p.images && p.images.length > 0) ? (
                            <img src={p.images[0]} className="mini-product-image" alt={p.title} />
                          ) : (
                            <div className="mini-product-image" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={24} color="#CBD5E0" /></div>
                          )}
                        </div>
                        <div className="mini-product-info">
                          <div className="mini-product-title">{p.title}</div>
                          <div className="mini-product-price">${Number(p.price).toFixed(2)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0', color: '#94A3B8' }}>
                    <p style={{ fontSize: '0.8rem' }}>Empty listings</p>
                  </div>
                )}
              </div>

              {/* Wishlist Section */}
              <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                <div className="profile-section-header" style={{ marginTop: 0 }}>
                  <div className="profile-section-title">
                    Wishlist <span className="profile-section-count">{wishlistProducts.length}</span>
                  </div>
                  <div className="profile-section-link" onClick={() => navigate('/profile/wishlist')} style={{ cursor: 'pointer' }}><ChevronRight size={20} /></div>
                </div>
                
                {wishlistProducts.length > 0 ? (
                  <div className="horizontal-scroll-row" style={{ marginTop: '0.5rem' }}>
                    {wishlistProducts.map(p => (
                      <Link to={`/product/${p.id}`} key={p.id} className="mini-product-card">
                        <div className="mini-product-image-container">
                          {(p.images && p.images.length > 0) ? (
                            <img src={p.images[0]} className="mini-product-image" alt={p.title} />
                          ) : (
                            <div className="mini-product-image" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={24} color="#CBD5E0" /></div>
                          )}
                        </div>
                        <div className="mini-product-info">
                          <div className="mini-product-title">{p.title}</div>
                          <div className="mini-product-price">${Number(p.price).toFixed(2)}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px' }}>
                            Views {p.views || 0} • Likes {p.likes || 0}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0', color: '#94A3B8' }}>
                    <p style={{ fontSize: '0.8rem' }}>No liked items</p>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-menu-container" style={{ marginTop: '1rem' }}>
              {user && user.role === 'admin' && (
                <div className="profile-menu-item" onClick={() => navigate('/admin')}>
                  <div className="profile-menu-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#D97706' }}><Shield size={18} /></div>
                  <span className="profile-menu-label">Admin Panel</span>
                  <ChevronRight size={18} className="profile-menu-arrow" />
                </div>
              )}
              <div className="profile-menu-item" onClick={() => navigate('/community')}>
                <div className="profile-menu-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}><Globe size={18} /></div>
                <span className="profile-menu-label">My Life Posts</span>
                <ChevronRight size={18} className="profile-menu-arrow" />
              </div>
              <div className="profile-menu-item" onClick={() => { logout(); navigate('/'); }} style={{ color: '#E53E3E' }}>
                <div className="profile-menu-icon" style={{ background: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E' }}><LogOut size={18} /></div>
                <span className="profile-menu-label">Logout</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function SalesManagementPage({ user, products, bumpProduct, deleteProduct, updateProductStatus }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('selling');
  const [actionMenuProduct, setActionMenuProduct] = useState(null);
  
  const myProducts = products
    .filter(p => String(p.seller_id) === String(user?.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const sellingList = myProducts.filter(p => p.status === 'selling' || p.status === 'reserved' || !p.status);
  const soldList = myProducts.filter(p => p.status === 'sold');

  const tabs = [
    { id: 'selling', label: `Selling ${sellingList.length}` },
    { id: 'sold', label: `Sold ${soldList.length}` }
  ];

  const filteredList = activeTab === 'selling' ? sellingList : soldList;

  if (!user) return <Navigate to="/login" />;

  const handleBump = async (product) => {
    try {
      await bumpProduct(product.id);
      alert(`[${product.title}] Listing has been bumped to the top!`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteProduct(product.id);
        setActionMenuProduct(null);
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleStatusUpdate = async (product, status) => {
    try {
      await updateProductStatus(product.id, status);
      setActionMenuProduct(null);
    } catch(e) {
      alert(e.message);
    }
  };

  return (
    <div className="management-container">
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, background: 'white', zIndex: 100 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', flex: 1 }}>My Sales</h2>
      </div>
      
      <div className="management-tab-bar" style={{ top: '57px' }}>
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`mgmt-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <main style={{ paddingBottom: '80px' }}>
        {filteredList.length > 0 ? (
          filteredList.map(p => (
            <div key={p.id} className="management-item">
              <div className="mgmt-item-main">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} className="mgmt-item-img" alt={p.title} />
                ) : (
                  <div className="mgmt-item-img" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera color="#CBD5E0" /></div>
                )}
                <div className="mgmt-item-info">
                  <div className="mgmt-item-title">{p.title}</div>
                  <div className="mgmt-item-sub">{new Date(p.created_at).toLocaleDateString()}</div>
                  <div className="mgmt-item-price">${Number(p.price).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="mgmt-item-stats">
                <div className="mgmt-stat"><Eye size={14} /> {p.views || 0}</div>
                <div className="mgmt-stat"><MessageCircle size={14} /> {p.chats || 0}</div>
                <div className="mgmt-stat"><Heart size={14} /> {p.likes || 0}</div>
              </div>

              <div className="mgmt-item-footer">
                <button className="mgmt-bump-btn" onClick={() => handleBump(p)}>Bump</button>
                <div className="mgmt-more-btn" onClick={() => setActionMenuProduct(p)}><MoreHorizontal size={20} /></div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94A3B8' }}>
            <ShoppingBag size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No items found.</p>
          </div>
        )}
      </main>

      {/* Action Sheet Menu */}
      {actionMenuProduct && (
        <div className="action-sheet-overlay" onClick={() => setActionMenuProduct(null)}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="action-sheet-btn" onClick={() => handleStatusUpdate(actionMenuProduct, 'reserved')}>Change to Reserved</button>
            <button className="action-sheet-btn" onClick={() => handleStatusUpdate(actionMenuProduct, 'sold')}>Change to Sold</button>
            <button className="action-sheet-btn" onClick={() => navigate(`/product/${actionMenuProduct.id}/edit`)}>Edit Post</button>
            <button className="action-sheet-btn danger" onClick={() => handleDelete(actionMenuProduct)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistManagementPage({ user, products, myProductLikes, toggleProductLike }) {
  const navigate = useNavigate();
  const likedProducts = products.filter(p => myProductLikes.includes(p.id));

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="management-container">
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, background: 'white', zIndex: 100 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', flex: 1 }}>Wishlist</h2>
      </div>
      
      <main style={{ paddingBottom: '80px' }}>
        {likedProducts.length > 0 ? (
          likedProducts.map(p => (
            <div key={p.id} className="management-item">
              <div className="mgmt-item-main" onClick={() => navigate(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} className="mgmt-item-img" alt={p.title} />
                ) : (
                  <div className="mgmt-item-img" style={{ background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera color="#CBD5E0" /></div>
                )}
                <div className="mgmt-item-info">
                  <div className="mgmt-item-title">{p.title}</div>
                  <div className="mgmt-item-sub">{new Date(p.created_at).toLocaleDateString()} • {likedProducts.length} likes</div>
                  <div className="mgmt-item-price">${Number(p.price).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="mgmt-item-footer">
                <button 
                  className="mgmt-bump-btn" 
                  style={{ background: '#FFF1F2', color: '#E11D48' }}
                  onClick={() => toggleProductLike(p.id)}
                >
                  Unlike
                </button>
                <div className="mgmt-more-btn" onClick={() => navigate(`/product/${p.id}`)}><ChevronRight size={20} /></div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94A3B8' }}>
            <Heart size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No liked items yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ========== UTILITIES ==========
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return past.toLocaleDateString();
};

function HomePage({ products, user }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');

  if (!user) return <Navigate to="/login" />;

  let filtered = [...products];
  if (search) filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  if (sort === 'priceAsc') filtered.sort((a,b) => a.price - b.price);
  if (sort === 'priceDesc') filtered.sort((a,b) => b.price - a.price);
  if (sort === 'latest') filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <>
      <Header title="All Listings" />
      <main>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" className="form-input" style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '20px', border: '1px solid var(--border-color)', background: '#F7FAFC' }} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <div onClick={() => setSort('latest')} className={`category-pill ${sort === 'latest' ? 'active' : ''}`} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>✨ Latest</div>
          <div onClick={() => setSort('priceAsc')} className={`category-pill ${sort === 'priceAsc' ? 'active' : ''}`} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>💸 Low Price</div>
          <div onClick={() => setSort('priceDesc')} className={`category-pill ${sort === 'priceDesc' ? 'active' : ''}`} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>💎 High Price</div>
        </div>

        <div className="product-grid">
          {filtered.map(p => {
            const hasImage = p.images && p.images.length > 0;
            return (
              <Link to={`/product/${p.id}`} key={p.id} className="product-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: '#F8FAFC' }}>
                  {hasImage ? (
                    <img src={p.images[0]} className="product-image" alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="product-image" style={{ width: '100%', height: '100%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={32} color="#ccc" />
                    </div>
                  )}
                  {p.status === 'reserved' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', backdropFilter: 'blur(2px)' }}>
                      Reserved
                    </div>
                  )}
                  {p.status === 'sold' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', backdropFilter: 'blur(2px)' }}>
                      Sold Out
                    </div>
                  )}
                </div>
                
                <div className="product-info">
                  <div className="product-title">{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#A0AEC0', marginBottom: '0.25rem' }}>{getTimeAgo(p.created_at)}</div>
                  <div className="product-desc">{p.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto', justifyContent: 'space-between' }}>
                    <div className="product-price">
                      {p.is_free === 1 ? (
                        <span className="badge-free">Free</span>
                      ) : `$${Number(p.price).toFixed(2)}`}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#A0AEC0', fontWeight: 'bold' }}>
                      {p.chats > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <MessageCircle size={14} /> {p.chats}
                        </div>
                      )}
                      {p.likes > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Heart size={14} /> {p.likes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <Link to={user ? "/register" : "/login"} className="fab-button">
          <PlusCircle size={24} />
          <span>Write</span>
        </Link>
      </main>
    </>
  );
}

function ProductDetailPage({ products, deleteProduct, user, token, createRoom, myProductLikes, toggleProductLike }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const product = products.find(p => p.id === parseInt(id));
  const [hasLiked, setHasLiked] = useState(myProductLikes && myProductLikes.includes(parseInt(id)));

  useEffect(() => {
    setHasLiked(myProductLikes && myProductLikes.includes(parseInt(id)));
    // Increment view count (Unique only)
    if (user && token) {
      fetch(`/api/products/${id}/view`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error);
    }
  }, [myProductLikes, id, user, token]);

  const handleLike = () => {
    if (!user) return navigate('/login');
    toggleProductLike(parseInt(id));
    setHasLiked(!hasLiked);
  };

  if (!product) return <div style={{ padding: '2rem', textAlign: 'center' }}>Product Not Found</div>;

  const images = (product.images && product.images.length > 0) ? product.images : [];
  const seller = product.seller || { name: 'Unknown', image: null };

  const handleScroll = () => {
    if (carouselRef.current) {
      const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
      setCurrentIndex(idx);
    }
  };

  const scrollNext = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: carouselRef.current.clientWidth, behavior: 'smooth' });
  };
  const scrollPrev = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: -carouselRef.current.clientWidth, behavior: 'smooth' });
  };

  return (
    <div style={{ paddingBottom: '80px', background: 'white', minHeight: '100vh' }}>
      <header style={{ position: 'relative', width: '100vw', maxWidth: '600px', margin: '0 auto' }}>
        <div onClick={() => navigate(-1)} style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', zIndex: 10 }}>
          <ArrowLeft size={24} color="#1A202C" />
        </div>
        {images.length > 0 ? (
          <>
            <div className="image-carousel" ref={carouselRef} onScroll={handleScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '350px', scrollbarWidth: 'none', background: '#F7FAFC' }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', minWidth: '100%', height: '100%', overflow: 'hidden', scrollSnapAlign: 'start' }}>
                  <img 
                    src={img} 
                    className="carousel-item" 
                    onClick={() => setIsZoomed(true)}
                    style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, cursor: 'zoom-in' }} 
                  />
                  {product.status === 'reserved' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', backdropFilter: 'blur(2px)', zIndex: 2, pointerEvents: 'none' }}>
                      Reserved
                    </div>
                  )}
                  {product.status === 'sold' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', backdropFilter: 'blur(2px)', zIndex: 2, pointerEvents: 'none' }}>
                      Sold Out
                    </div>
                  )}
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button className="carousel-arrow" onClick={scrollPrev} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.75)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <ChevronLeft size={20} color="#333" />
                  </button>
                )}
                {currentIndex < images.length - 1 && (
                  <button className="carousel-arrow" onClick={scrollNext} style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.75)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <ChevronRight size={20} color="#333" />
                  </button>
                )}
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>{currentIndex + 1} / {images.length}</div>
              </>
            )}
          </>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '350px', background: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#CBD5E0', gap: '1rem', overflow: 'hidden' }}>
            <Camera size={48} />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>No image available</span>
            {product.status === 'reserved' && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', backdropFilter: 'blur(2px)', zIndex: 2 }}>
                Reserved
              </div>
            )}
            {product.status === 'sold' && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', backdropFilter: 'blur(2px)', zIndex: 2 }}>
                Sold Out
              </div>
            )}
          </div>
        )}
      </header>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {seller.image ? <img src={seller.image} className="profile-img" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={20} color="#777" /></div>}
          <div><div style={{ fontWeight: '600', fontSize: '1rem' }}>{seller.name || 'Anonymous'}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seoul, Korea</div></div>
        </div>
        <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem', lineHeight: '1.3' }}>{product.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div onClick={handleLike} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasLiked ? 'rgba(255, 126, 54, 0.1)' : '#F7FAFC', borderRadius: '50%', width: '40px', height: '40px', transition: 'all 0.2s' }}>
              <Heart size={20} color={hasLiked ? "var(--primary)" : "var(--text-muted)"} fill={hasLiked ? "var(--primary)" : "none"} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          <span>{getTimeAgo(product.created_at)}</span>
          <span>•</span>
          <span>Views {product.views || 0}</span>
          <span>•</span>
          <span>Likes {product.likes || 0}</span>
        </div>
        <p style={{ lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontSize: '1.05rem', minHeight: '100px' }}>{product.description}</p>
      </div>
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '600px', background: 'white', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: product.is_free === 1 ? '#008243' : 'var(--primary)' }}>
          {product.is_free === 1 ? (
            <span className="badge-free" style={{ fontSize: '1.1rem', padding: '6px 14px', borderRadius: '8px' }}>
              Free
            </span>
          ) : `$${Number(product.price).toFixed(2)}`}
        </div>
        {user && String(user.id) === String(product.seller_id) ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => navigate(`/product/${product.id}/edit`)} className="btn-primary" style={{ background: '#718096', boxShadow: 'none', padding: '0.75rem 1.2rem', width: 'auto' }}>Edit</button>
            <button onClick={async () => {
              if (window.confirm('Delete this item?')) {
                try { await deleteProduct(product.id); navigate('/'); } 
                catch(e){ alert(e.message); }
              }
            }} className="btn-primary" style={{ background: '#E53E3E', boxShadow: 'none', padding: '0.75rem 1.2rem', width: 'auto' }}>Delete</button>
          </div>
        ) : product.status === 'sold' ? (
          <button disabled className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', width: 'auto', background: '#CBD5E0', cursor: 'not-allowed', border: 'none', boxShadow: 'none' }}>Sold Out</button>
        ) : (
          <button onClick={async () => {
            if (!user) return navigate('/login');
            try {
              const roomId = await createRoom(product.id, product.seller_id);
              navigate(`/chat/${roomId}`);
            } catch (e) { alert(e.message); }
          }} className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', width: 'auto' }}>Chat</button>
        )}
      </div>

      {/* Lightbox / Zoom Overlay */}
      {isZoomed && (
        <div className="zoom-overlay" onClick={() => setIsZoomed(false)}>
          <button className="zoom-close" onClick={() => setIsZoomed(false)}>
            <X size={28} />
          </button>
          
          <div className="zoom-content" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && currentIndex > 0 && (
              <button 
                className="zoom-nav-btn" 
                style={{ left: '20px' }} 
                onClick={(e) => { e.stopPropagation(); scrollPrev(); }}
              >
                <ChevronLeft size={32} />
              </button>
            )}
            
            <img 
              src={images[currentIndex]} 
              className="zoom-expanded-img" 
              alt="Zoomed" 
            />

            {images.length > 1 && currentIndex < images.length - 1 && (
              <button 
                className="zoom-nav-btn" 
                style={{ right: '20px' }} 
                onClick={(e) => { e.stopPropagation(); scrollNext(); }}
              >
                <ChevronRight size={32} />
              </button>
            )}
            
            <div style={{ position: 'absolute', bottom: '30px', color: 'white', fontWeight: '600', opacity: 0.8, background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '20px' }}>
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditProductWrapper({ products, updateProduct, user }) {
  const { id } = useParams();
  const product = products.find(p => p.id === parseInt(id));
  if (!product) return <div style={{padding:'2rem'}}>Not Found</div>;
  return <RegisterPage existingProduct={product} updateProduct={updateProduct} user={user} />;
}

function RegisterPage({ addProduct, updateProduct, user, existingProduct }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState(existingProduct && existingProduct.images ? existingProduct.images : []);
  const [title, setTitle] = useState(existingProduct ? existingProduct.title : '');
  const [price, setPrice] = useState(existingProduct ? String(existingProduct.price) : '');
  const [description, setDescription] = useState(existingProduct ? existingProduct.description : '');
  const [isFree, setIsFree] = useState(existingProduct ? existingProduct.is_free === 1 : false);

  if (!user) return <Navigate to="/login" />;
  if (existingProduct && String(user.id) !== String(existingProduct.seller_id)) return <Navigate to="/" />;

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    const imgUrl = previews[index];
    if (imgUrl.startsWith('blob:')) {
      const blobIndex = previews.filter(p => p.startsWith('blob:')).indexOf(imgUrl);
      setFiles(files.filter((_, i) => i !== blobIndex));
    }
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || (!isFree && !price)) return;
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', isFree ? '0' : price);
    formData.append('description', description);
    formData.append('isFree', isFree);
    formData.append('existingImages', JSON.stringify(previews.filter(p => p.startsWith('/uploads'))));
    files.forEach(file => formData.append('images', file));

    try {
      if (existingProduct) {
        await updateProduct(existingProduct.id, formData);
        navigate(-1);
      } else {
        await addProduct(formData);
        navigate('/', { replace: true });
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Header title={existingProduct ? "Edit" : ""} showBack={true} />
      <main>
        <div className="glass-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <div onClick={() => fileInputRef.current.click()} style={{ minWidth: '100px', height: '100px', border: '2px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', background: 'white', flexShrink: 0 }}>
                  <Camera size={24} style={{ marginBottom: '0.25rem' }} />
                  <span style={{ fontSize: '0.8rem' }}>{files.length}/10</span>
                </div>
                {previews.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', minWidth: '100px', height: '100px', flexShrink: 0 }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                    <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>X</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="sale-type-toggle">
              <button type="button" className={`sale-type-btn ${!isFree ? 'active' : ''}`} onClick={() => setIsFree(false)}>For Sale</button>
              <button type="button" className={`sale-type-btn ${isFree ? 'active' : ''}`} onClick={() => setIsFree(true)}>Giveaway</button>
            </div>

            <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            
            {!isFree && (
              <div className="form-group">
                <label className="form-label">Price ($)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="form-input" style={{ paddingLeft: '1.5rem' }} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
                  <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#777' }}>$</span>
                </div>
              </div>
            )}

            {isFree && (
              <div style={{ background: '#F0FFF4', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', color: '#2F855A', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🎁</span> This item will be shared with the community for free.
              </div>
            )}
            
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows="4" value={description} onChange={e => setDescription(e.target.value)}></textarea></div>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Check size={20} /> {existingProduct ? "Update Listing" : "Post Listing"}</button>
          </form>
        </div>
      </main>
    </>
  );
}

// ========== COMMUNITY ==========
function CommunityPage({ posts }) {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? posts : posts.filter(p => p.category === filter);

  return (
    <>
      <Header title="Community" />
      <main>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['All', 'Free Talk', 'Q&A'].map(cat => <div key={cat} onClick={() => setFilter(cat)} className={`category-pill ${filter === cat ? 'active' : ''}`}>{cat}</div>)}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(p => (
            <Link to={`/community/${p.id}`} key={p.id} className="glass-card" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', background: 'rgba(255,126,54,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{p.category}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.author.name || 'Anonymous'}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{p.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.content}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Heart size={16} /> {p.likes}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MessageCircle size={16} /> {p.comments ? p.comments.length : 0}</div>
              </div>
            </Link>
          ))}
        </div>
        <Link to="/community/new" className="fab-button">
          <Edit2 size={24} />
          <span>Write</span>
        </Link>
      </main>
    </>
  );
}

function CommunityDetailPage({ posts, myLikes, toggleLike, addComment, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const postId = parseInt(id);
  
  const post = posts.find(p => p.id === postId);
  if (!post) return <div style={{ padding: '2rem' }}>Not Found</div>;

  const [hasLiked, setHasLiked] = useState(myLikes.includes(postId));
  
  useEffect(() => {
    setHasLiked(myLikes.includes(postId));
  }, [myLikes, postId]);

  const handleComment = (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText('');
  };

  const handleLike = () => {
    if (!user) return navigate('/login');
    toggleLike(post.id);
    setHasLiked(!hasLiked);
  };

  return (
    <div style={{ paddingBottom: '20px', background: 'white', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: '1rem' }} />
        <span style={{ fontWeight: '600' }}></span>
      </header>
      <main style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {post.author.image ? <img src={post.author.image} className="profile-img" style={{ width: '40px', height: '40px' }} /> : <div className="profile-placeholder" style={{ width: '40px', height: '40px' }}><UserIcon size={20} /></div>}
          <div><div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{post.author.name || 'Anonymous'}</div></div>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(255,126,54,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{post.category}</span>
        <h1 style={{ fontSize: '1.3rem', marginTop: '0.5rem', marginBottom: '1rem', lineHeight: '1.4' }}>{post.title}</h1>
        <p style={{ lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{post.content}</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: hasLiked ? 'rgba(255, 126, 54, 0.1)' : 'none', border: `1px solid ${hasLiked ? 'var(--primary)' : 'var(--border-color)'}`, padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', color: hasLiked ? 'var(--primary)' : 'var(--text-main)', fontWeight: '500', transition: 'all 0.2s ease' }}>
            <Heart size={18} color={hasLiked ? "var(--primary)" : "var(--text-main)"} fill={hasLiked ? "var(--primary)" : "none"} /> Like ({post.likes})
          </button>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Comments ({(post.comments||[]).length})</h3>
        <form onSubmit={handleComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
          <button type="submit" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(post.comments||[]).map((c, i) => (
            <div key={i} className="comment-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {c.author.image ? <img src={c.author.image} className="profile-img" style={{ width: '24px', height: '24px' }} /> : <div className="profile-placeholder" style={{ width: '24px', height: '24px' }}><UserIcon size={14} /></div>}
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{c.author.name || 'Anonymous'}</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{c.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function NewPostPage({ addPost, user }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('Free Talk');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  if (!user) return <Navigate to="/login" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    await addPost({ title, content, category });
    navigate('/community');
  };

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', background: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: '1rem' }} />
        <span style={{ fontWeight: '600', fontSize: '1.2rem' }}></span>
      </header>
      <main>
        <div className="glass-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Free Talk">Free Talk</option>
                <option value="Q&A">Q&A</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Content</label><textarea className="form-input" rows="6" value={content} onChange={e => setContent(e.target.value)} required></textarea></div>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Check size={20} /> Post</button>
          </form>
        </div>
      </main>
    </>
  );
}

// ========== CHATS ==========
function ChatListPage({ rooms, user, filter, setFilter }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" />;

  const filtered = rooms.filter(r => {
    if (filter === 'selling') return Number(r.seller_id) === Number(user.id);
    if (filter === 'buying') return Number(r.buyer_id) === Number(user.id);
    return true;
  });
  
  return (
    <>
      <Header />
      <main style={{ padding: 0 }}>
        <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 'var(--header-height)', zIndex: 9 }}>
          <div className="management-tab-bar" style={{ position: 'relative', top: 0, borderBottom: 'none' }}>
            <div className={`mgmt-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Chats</div>
            <div className={`mgmt-tab ${filter === 'selling' ? 'active' : ''}`} onClick={() => setFilter('selling')}>Selling</div>
            <div className={`mgmt-tab ${filter === 'buying' ? 'active' : ''}`} onClick={() => setFilter('buying')}>Buying</div>
          </div>
          <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#94A3B8', fontWeight: '500', display: 'flex', justifyContent: 'flex-end', background: '#FAFAFA' }}>
            Total {filtered.length} rooms
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state-container" style={{ paddingTop: '5rem' }}>
            <div className="empty-state-icon">
              <MessageCircle size={40} />
            </div>
            <h2 className="empty-state-title">No matching chats</h2>
            <p className="empty-state-desc">Try changing the filter or browse more items.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(r => (
              <Link to={`/chat/${r.id}`} key={r.id} className="chat-list-item">
                <div className="chat-avatar-column">
                  {r.partner_image ? (
                    <img src={r.partner_image} style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserIcon size={24} color="#94A3B8" />
                    </div>
                  )}
                </div>
                
                <div className="chat-info-column">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '4px' }}>
                    <div className="chat-partner-name">{r.partner_name || 'Unknown'}</div>
                    <div className="chat-last-time">
                      {r.last_message_time ? (() => {
                        const d = new Date(r.last_message_time.endsWith('Z') ? r.last_message_time : r.last_message_time + 'Z');
                        if (isNaN(d.getTime())) return '';
                        const now = new Date();
                        const isToday = d.toDateString() === now.toDateString();
                        return isToday 
                          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      })() : ''}
                    </div>
                  </div>
                  <div className="chat-last-message">{r.last_message || 'Start chatting!'}</div>
                </div>

                <div className="chat-meta-column">
                  {r.product_images && r.product_images.length > 0 && (
                    <img src={r.product_images[0]} className="chat-product-thumbnail" />
                  )}
                  {r.unread_count > 0 && (
                    <span className="chat-unread-badge">{r.unread_count}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ChatRoomPage({ messages, joinRoom, sendMessage, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { if (id && user) joinRoom(parseInt(id)); }, [id, user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!user) return <Navigate to="/login" />;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(parseInt(id), text);
    setText('');
  };

  return (
    <div className="chat-room-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: '1rem' }} />
        <span style={{ fontWeight: '600', fontSize: '1.2rem', color: '#1A1A1A' }}></span>
      </header>
      
      <main style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(m => {
            const isMe = String(m.sender_id) === String(user.id);
            const rawDate = m.created_at || new Date().toISOString();
            const dateObj = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
            const timeStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.6rem', marginBottom: '0.2rem', maxWidth: '88%' }}>
                {!isMe && (
                   m.profile_image 
                     ? <img src={m.profile_image} style={{ width: '38px', height: '38px', borderRadius: '14px', objectFit: 'cover', marginTop: '4px', flexShrink: 0 }} />
                     : <div style={{ width: '38px', height: '38px', borderRadius: '14px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', flexShrink: 0 }}><UserIcon size={20} color="#94A3B8" /></div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', flex: 1, minWidth: 0 }}>
                  {!isMe && <span style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px', marginLeft: '4px', fontWeight: '500' }}>{m.profile_name || 'User'}</span>}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div className={isMe ? 'bubble-me' : 'bubble-partner'} style={{ wordBreak: 'break-word', fontSize: '0.95rem' }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#A0AEC0', marginBottom: '2px', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: '500' }}>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="chat-input-container">
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', width: '100%' }}>
          <input type="text" className="chat-input-field" placeholder="메시지 보내기" value={text} onChange={e => setText(e.target.value)} />
          <button type="submit" className="chat-send-btn" disabled={!text.trim()} style={{ opacity: text.trim() ? 1 : 0.5 }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ======================== ADMIN PAGE (PREMIUM) ========================
function AdminPage({ user, token }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [adminInput, setAdminInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();

    // Socket for Admin
    socketRef.current = io(window.location.origin);
    const s = socketRef.current;
    
    return () => s.disconnect();
  }, [user]);

  useEffect(() => {
    if (selectedRoomId && socketRef.current) {
      socketRef.current.emit('joinRoom', selectedRoomId);
      socketRef.current.on('newMessage', (msg) => {
        if (msg.room_id === selectedRoomId) {
          setRoomMessages(prev => [...prev, msg]);
        }
      });
      return () => {
        socketRef.current.off('newMessage');
      };
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [roomMessages]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [s, u, pr, po, cr] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/users`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/products`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/posts`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/chat-rooms`, { headers }).then(r => r.json())
      ]);
      setStats(s || { users: 0, products: 0, posts: 0, chatRooms: 0 });
      setUsers(Array.isArray(u) ? u : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setPosts(Array.isArray(po) ? po : []);
      setChatRooms(Array.isArray(cr) ? cr : []);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchRoomMessages = async (roomId) => {
    setSelectedRoomId(roomId);
    try {
      const res = await fetch(`${API_BASE}/admin/chat-rooms/${roomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRoomMessages(data);
    } catch (e) { console.error(e); }
  };

  const sendAdminMessage = () => {
    if (!adminInput.trim() || !selectedRoomId) return;
    const msgData = {
      room_id: selectedRoomId,
      sender_id: user.id,
      content: adminInput
    };
    socketRef.current.emit('sendMessage', msgData);
    setAdminInput('');
  };

  const handleDelete = async (type, id) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/${type}s/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ marginTop: '1rem', color: '#64748B', fontWeight: '500' }}>Accessing Secure Dashboard...</p>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.8)', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}>
      <div style={{ padding: '12px', borderRadius: '14px', background: `${color}15`, color: color }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E293B' }}>{value.toLocaleString()}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      <Header title="Commander Center" />
      
      <main style={{ padding: '1rem', paddingBottom: '100px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(90deg, #1A1A1A 0%, #333 100%)', borderRadius: '20px', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Globe size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Admin System v2.0</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Hello, {user.profile_name || 'Manager'}</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: '0.5rem 0 0' }}>Everything is running smooth. {stats ? `${stats.users} neighbors are active.` : ''}</p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: '#F1F5F9', padding: '5px', borderRadius: '15px', overflowX: 'auto' }}>
          {['dashboard', 'users', 'products', 'posts', 'chats'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{ flex: 1, minWidth: '80px', padding: '0.7rem 0.5rem', borderRadius: '10px', border: 'none', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#1A1A1A' : '#64748B', fontSize: '0.85rem', fontWeight: activeTab === tab ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === tab ? '0 4px 10px rgba(0,0,0,0.05)' : 'none' }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', animation: 'fadeIn 0.4s' }}>
            <StatCard title="Total Users" value={stats.users} icon={Users} color="#3B82F6" />
            <StatCard title="Products" value={stats.products} icon={ShoppingBag} color="#10B981" />
            <StatCard title="Community" value={stats.posts} icon={Globe} color="#8B5CF6" />
            <StatCard title="Chat Rooms" value={stats.chatRooms} icon={MessageCircle} color="#F59E0B" />
            <div className="glass-card" style={{ gridColumn: 'span 2', padding: '1.5rem', background: 'white' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>System Health</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748B' }}>API Server</span>
                  <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#166534', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>ONLINE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748B' }}>Database (SQLite)</span>
                  <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#166534', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>STABLE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            {users.map(u => (
              <div key={u.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '0.75rem', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    {u.profile_image ? <img src={u.profile_image} style={{ width: '48px', height: '48px', borderRadius: '15px', objectFit: 'cover' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={24} color="#94A3B8" /></div>}
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', background: '#10B981', border: '2px solid white', borderRadius: '50%' }}></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1E293B' }}>{u.login_id}</div>
                    <div style={{ fontSize: '0.75rem', color: u.role === 'admin' ? 'var(--primary)' : '#94A3B8', fontWeight: 'bold' }}>{u.role.toUpperCase()} • Joined {new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => handleDelete('user', u.id)} style={{ padding: '8px', background: '#FFF1F2', color: '#E11D48', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                    <LogOut size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'products' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            {products.map(p => (
              <div key={p.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '0.75rem', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <img src={p.images[0]} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>${p.price.toLocaleString()} • Seller: {p.seller_name}</div>
                  </div>
                </div>
                <button onClick={() => handleDelete('product', p.id)} style={{ padding: '8px', background: '#FFF1F2', color: '#E11D48', border: 'none', borderRadius: '10px', marginLeft: '1rem' }}>
                  <LogOut size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'posts' && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            {posts.map(p => (
              <div key={p.id} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--primary)', background: 'var(--primary)15', padding: '4px 10px', borderRadius: '20px' }}>{p.category.toUpperCase()}</span>
                  <button onClick={() => handleDelete('post', p.id)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><LogOut size={18} /></button>
                </div>
                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1E293B', marginBottom: '0.5rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748B' }}>By {p.author_name} • {p.likes || 0} Likes</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s', height: '60vh' }}>
            <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
              {/* Room List */}
              <div className="glass-card" style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '100%' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '0.5rem' }}>Active Conversations</h3>
                {chatRooms.map(room => (
                  <div 
                    key={room.id} 
                    onClick={() => fetchRoomMessages(room.id)}
                    style={{ padding: '12px', borderRadius: '12px', background: selectedRoomId === room.id ? 'var(--primary)10' : '#F8FAFC', border: selectedRoomId === room.id ? '1px solid var(--primary)' : '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1E293B' }}>{room.product_title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{room.user1_name} & {room.user2_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.last_message || 'No messages'}</div>
                  </div>
                ))}
              </div>
              
              {/* Monitor / Intervene */}
              <div className="glass-card" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', padding: 0, background: 'white', overflow: 'hidden' }}>
                {selectedRoomId ? (
                  <>
                    <div style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      Monitoring Room #{selectedRoomId}
                    </div>
                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {roomMessages.map((m, idx) => (
                        <div key={idx} style={{ alignSelf: m.sender_role === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: '2px', textAlign: m.sender_role === 'admin' ? 'right' : 'left' }}>
                            {m.sender_role === 'admin' ? <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>ADMIN</span> : m.sender_name}
                          </div>
                          <div style={{ 
                            padding: '8px 12px', 
                            borderRadius: '12px', 
                            fontSize: '0.85rem', 
                            background: m.sender_role === 'admin' ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#F1F5F9',
                            color: m.sender_role === 'admin' ? 'white' : '#1E293B',
                            boxShadow: m.sender_role === 'admin' ? '0 4px 10px rgba(245, 158, 11, 0.2)' : 'none'
                          }}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '12px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
                      <input 
                        className="form-input" 
                        placeholder="Type intervention..." 
                        value={adminInput}
                        onChange={e => setAdminInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && sendAdminMessage()}
                        style={{ padding: '10px', fontSize: '0.85rem' }} 
                      />
                      <button onClick={sendAdminMessage} style={{ padding: '10px', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                        <Send size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                    Select a room to monitor
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ========== ROOT ==========
function AppContent() {
  const { user, token, loading, login, signup, logout, updateProfile } = useAuth();
  const { products, myProductLikes, addProduct, updateProduct, deleteProduct, toggleProductLike, bumpProduct, updateProductStatus } = useProducts(token);
  const { posts, myLikes, addPost, toggleLike, addComment } = useCommunity(token);
  const { rooms, messages, createRoom, joinRoom, sendMessage, notification, setNotification } = useChat(token, user);
  
  usePushNotifications(token, user);

  const navigate = useNavigate();
  const [chatFilter, setChatFilter] = useState('all');

  if (loading) return <div>Loading...</div>;

  return (
    <div className="app-container">
      {notification && (
        <div onClick={() => { setNotification(null); navigate(`/chat/${notification.roomId}`); }} style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999, width: '90%', maxWidth: '350px', cursor: 'pointer', animation: 'slideInDown 0.3s' }}>
          {notification.image ? <img src={notification.image} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UserIcon size={20} color="#777" /></div>}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{notification.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{notification.text}</div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage products={products} user={user} />} />
        <Route path="/chats" element={<ChatListPage rooms={rooms} user={user} filter={chatFilter} setFilter={setChatFilter} />} />
        <Route path="/chat/:id" element={<ChatRoomPage messages={messages} joinRoom={joinRoom} sendMessage={sendMessage} user={user} />} />
        <Route path="/product/:id" element={<ProductDetailPage products={products} deleteProduct={deleteProduct} user={user} token={token} createRoom={createRoom} myProductLikes={myProductLikes} toggleProductLike={toggleProductLike} />} />
        <Route path="/register" element={<RegisterPage addProduct={addProduct} user={user} />} />
        <Route path="/product/:id/edit" element={<EditProductWrapper products={products} updateProduct={updateProduct} user={user} />} />
        <Route path="/community" element={<CommunityPage posts={posts} />} />
        <Route path="/community/:id" element={<CommunityDetailPage posts={posts} myLikes={myLikes} toggleLike={toggleLike} addComment={addComment} user={user} />} />
        <Route path="/community/new" element={<NewPostPage addPost={addPost} user={user} />} />
        <Route path="/login" element={<LoginPage login={login} signup={signup} />} />
        <Route path="/profile" element={<ProfilePage user={user} logout={logout} updateProfile={updateProfile} products={products} myProductLikes={myProductLikes} chatRooms={rooms} />} />
        <Route path="/profile/sales" element={<SalesManagementPage user={user} products={products} bumpProduct={bumpProduct} deleteProduct={deleteProduct} updateProductStatus={updateProductStatus} />} />
        <Route path="/profile/wishlist" element={<WishlistManagementPage user={user} products={products} myProductLikes={myProductLikes} toggleProductLike={toggleProductLike} />} />
        <Route path="/admin" element={<AdminPage user={user} token={token} />} />
      </Routes>
      <BottomNav user={user} rooms={rooms} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
