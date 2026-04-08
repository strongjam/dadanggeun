import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { Home, Search, MessageCircle, User as UserIcon, PlusCircle, Camera, Check, ArrowLeft, LogOut, Users, Heart, Send, ChevronLeft, ChevronRight, Edit2, Globe, ShoppingBag } from 'lucide-react';
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

  return { products, myProductLikes, fetchProducts, addProduct, updateProduct, deleteProduct, toggleProductLike };
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
        });

        await fetch(`${API_BASE}/notifications/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(pushSubscription)
        });
      } catch (e) {
        console.error('Push setup error:', e);
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
      <Link to={user ? "/register" : "/login"} className={`nav-item ${path === '/register' ? 'active' : ''}`}><PlusCircle size={24} /><span>Sell</span></Link>
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
        await signup(loginId, password);
        alert('회원가입이 완료되었습니다! 이제 로그인해주세요.');
        setIsLogin(true);
        setPassword('');
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
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ marginBottom: '1rem' }}>{isLogin ? "Login" : "Sign Up"}</button>
            <button type="button" onClick={handleTestLogin} className="btn-primary" style={{ marginBottom: '1.5rem', background: '#3182CE', boxShadow: 'none' }}>Quick Test Login</button>
            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => setIsLogin(!isLogin)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                {isLogin ? "Sign up here" : "Login here"}
              </span>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function ProfilePage({ user, logout, updateProfile, products, myProductLikes }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user?.profile_name || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profile_image || '');

  const wishlistProducts = products.filter(p => myProductLikes.includes(p.id));

  if (!user) return <Navigate to="/login" />;

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
    alert('Profile updated successfully!');
  };

  return (
    <>
      <Header title="My Profile" />
      <main>
        <div className="glass-card">
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              <input type="file" accept="image/*" id="profilePic" onChange={handleImageChange} style={{ display: 'none' }} />
              <label htmlFor="profilePic" style={{ cursor: 'pointer', position: 'relative' }}>
                {preview ? <img src={preview} className="profile-img" style={{ width: '80px', height: '80px' }} /> : <div className="profile-placeholder" style={{ width: '80px', height: '80px' }}><Camera size={32} /></div>}
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '4px' }}><Camera size={14} /></div>
              </label>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nickname</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Setup your nickname" required />
            </div>

            <button type="submit" className="btn-primary" style={{ marginBottom: '1.5rem' }}>Save Profile</button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }}></div>

          <button onClick={() => { logout(); navigate('/'); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#E53E3E', boxShadow: 'none', marginBottom: '1.5rem' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Heart size={20} color="var(--primary)" fill="var(--primary)" /> My Wishlist
          </h2>
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
             {wishlistProducts.length > 0 ? wishlistProducts.map(p => (
               <Link to={`/product/${p.id}`} key={p.id} className="product-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                 {(p.images && p.images.length > 0) ? <img src={p.images[0]} className="product-image" alt={p.title} /> : <div className="product-image" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={32} color="#ccc" /></div>}
                 <div className="product-info">
                   <div className="product-title">{p.title}</div>
                   <div className="product-price">${Number(p.price).toFixed(2)}</div>
                 </div>
               </Link>
             )) : (
               <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                 No liked items yet.
               </div>
             )}
          </div>
        </div>
      </main>
    </>
  );
}

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
                {hasImage ? <img src={p.images[0]} className="product-image" alt={p.title} /> : <div className="product-image" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={32} color="#ccc" /></div>}
                <div className="product-info">
                  <div className="product-title">{p.title}</div>
                  <div className="product-desc">{p.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
                    <div className="product-price">${Number(p.price).toFixed(2)}</div>
                    {p.is_quick === 1 && <span className="badge-quick">⚡ Quick Sale</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </>
  );
}

function ProductDetailPage({ products, deleteProduct, user, createRoom, myProductLikes, toggleProductLike }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const product = products.find(p => p.id === parseInt(id));
  const [hasLiked, setHasLiked] = useState(myProductLikes && myProductLikes.includes(parseInt(id)));

  useEffect(() => {
    setHasLiked(myProductLikes && myProductLikes.includes(parseInt(id)));
  }, [myProductLikes, id]);

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
            <div className="image-carousel" ref={carouselRef} onScroll={handleScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '350px', scrollbarWidth: 'none' }}>
              {images.map((img, idx) => <img key={idx} src={img} className="carousel-item" style={{ minWidth: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'start' }} />)}
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
          <div style={{ width: '100%', height: '350px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={48} color="#A0A0A0" />
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
            {product.is_quick === 1 && <span className="badge-quick" style={{ padding: '4px 8px' }}>⚡ Quick Sale</span>}
            <div onClick={handleLike} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasLiked ? 'rgba(255, 126, 54, 0.1)' : '#F7FAFC', borderRadius: '50%', width: '40px', height: '40px', transition: 'all 0.2s' }}>
              <Heart size={20} color={hasLiked ? "var(--primary)" : "var(--text-muted)"} fill={hasLiked ? "var(--primary)" : "none"} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Saves ∙ {product.likes || 0}</div>
        <p style={{ lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontSize: '1.05rem', minHeight: '100px' }}>{product.description}</p>
      </div>
      <div style={{ position: 'fixed', bottom: 0, width: '100%', maxWidth: '600px', background: 'white', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>${Number(product.price).toFixed(2)}</div>
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
  const [isQuick, setIsQuick] = useState(existingProduct ? existingProduct.is_quick === 1 : false);

  if (!user) return <Navigate to="/login" />;
  if (existingProduct && String(user.id) !== String(existingProduct.seller_id)) return <Navigate to="/" />;

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    // If it's a new file (blob), remove from files array too
    const imgUrl = previews[index];
    if (imgUrl.startsWith('blob:')) {
      const blobIndex = previews.filter(p => p.startsWith('blob:')).indexOf(imgUrl);
      setFiles(files.filter((_, i) => i !== blobIndex));
    }
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price) return;
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', isQuick ? parseFloat(price) * 0.7 : parseFloat(price));
    formData.append('description', description);
    formData.append('isQuick', isQuick);
    formData.append('existingImages', JSON.stringify(previews.filter(p => p.startsWith('/uploads'))));
    files.forEach(file => formData.append('images', file));

    try {
      if (existingProduct) {
        await updateProduct(existingProduct.id, formData);
        navigate(`/product/${existingProduct.id}`);
      } else {
        await addProduct(formData);
        navigate('/');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Header title={existingProduct ? "Edit Listing" : "Sell an Item"} showBack={true} />
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
            <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Price ($)</label><input type="number" className="form-input" value={price} onChange={e => setPrice(e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows="4" value={description} onChange={e => setDescription(e.target.value)}></textarea></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isQuick} onChange={e => setIsQuick(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
              <span style={{ fontWeight: '500' }}>Mark as "Quick Sale" (-30% applied)</span>
            </label>
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
      <Header rightContent={<Link to="/community/new" style={{ background: 'var(--primary)', color: 'white', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}><Edit2 size={16} /> Write</Link>} />
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
        <span style={{ fontWeight: '600' }}>Post</span>
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
        <span style={{ fontWeight: '600', fontSize: '1.2rem' }}>Write Post</span>
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
function ChatListPage({ rooms, user }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" />;
  
  return (
    <>
      <Header rightContent={<span style={{fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)'}}>Chats</span>} />
      <main>
        {rooms.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-icon">
              <MessageCircle size={40} />
            </div>
            <h2 className="empty-state-title">채팅방이 없습니다</h2>
            <p className="empty-state-desc">새로운 이웃과 따뜻한 거래를 시작해보세요.</p>
            <button className="empty-state-btn" onClick={() => navigate('/')}>
              상품 둘러보기
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rooms.map(r => (
              <Link to={`/chat/${r.id}`} key={r.id} className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', textDecoration: 'none', color: 'inherit', marginBottom: 0, padding: '1rem', position: 'relative' }}>
                {r.partner_image ? <img src={r.partner_image} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UserIcon size={28} color="#777" /></div>}
                <div style={{ flex: 1, minWidth: 0, paddingRight: r.product_images && r.product_images.length > 0 ? '40px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{r.partner_name || 'Unknown'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.last_message_time ? (() => {
                        const d = new Date(r.last_message_time.endsWith('Z') ? r.last_message_time : r.last_message_time + 'Z');
                        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
                      })() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last_message || 'Start chatting!'}</div>
                </div>
                {r.product_images && r.product_images.length > 0 && <img src={r.product_images[0]} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: '1rem', top: '1rem' }} />}
                {r.unread_count > 0 && <span style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{r.unread_count}</span>}
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#abc1d1' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: '1rem' }} />
        <span style={{ fontWeight: '600', fontSize: '1.2rem', color: '#1A1A1A' }}>Chat</span>
      </header>
      
      <main style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {messages.map(m => {
            const isMe = String(m.sender_id) === String(user.id);
            const rawDate = m.created_at || new Date().toISOString();
            const dateObj = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
            const timeStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.5rem', marginBottom: '0.4rem', maxWidth: '85%' }}>
                {!isMe && (
                   m.profile_image 
                     ? <img src={m.profile_image} style={{ width: '40px', height: '40px', borderRadius: '16px', objectFit: 'cover', marginTop: '2px', flexShrink: 0 }} />
                     : <div style={{ width: '40px', height: '40px', borderRadius: '16px', background: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}><UserIcon size={24} color="#777" /></div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', flex: 1, minWidth: 0 }}>
                  {!isMe && <span style={{ fontSize: '0.75rem', color: '#444', marginBottom: '0.2rem', marginLeft: '0.2rem' }}>{m.profile_name || 'User'}</span>}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div className={isMe ? 'bubble-me' : 'bubble-partner'} style={{ background: isMe ? '#FEE500' : 'white', color: '#1A1A1A', padding: '0.55rem 0.8rem', borderRadius: '16px', borderTopRightRadius: isMe ? '3px' : '16px', borderTopLeftRadius: !isMe ? '3px' : '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.95rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#556677', marginBottom: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div style={{ padding: '0.6rem 0.8rem', background: 'white' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="text" className="form-input" style={{ flex: 1, borderRadius: '24px', padding: '0.7rem 1rem', background: '#F0F0F0', border: 'none', fontSize: '0.95rem' }} placeholder="메시지를 입력하세요..." value={text} onChange={e => setText(e.target.value)} />
          <button type="submit" style={{ width: '40px', height: '40px', borderRadius: '50%', background: text.trim() ? '#FEE500' : '#E0E0E0', color: text.trim() ? '#1A1A1A' : '#A0A0A0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default', transition: 'background 0.2s' }} disabled={!text.trim()}><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
}

// ========== ROOT ==========
function AppContent() {
  const { user, token, loading, login, signup, logout, updateProfile } = useAuth();
  const { products, myProductLikes, addProduct, updateProduct, deleteProduct, toggleProductLike } = useProducts(token);
  const { posts, myLikes, addPost, toggleLike, addComment } = useCommunity(token);
  const { rooms, messages, createRoom, joinRoom, sendMessage, notification, setNotification } = useChat(token, user);
  
  usePushNotifications(token, user);

  const navigate = useNavigate();

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
        <Route path="/chats" element={<ChatListPage rooms={rooms} user={user} />} />
        <Route path="/chat/:id" element={<ChatRoomPage messages={messages} joinRoom={joinRoom} sendMessage={sendMessage} user={user} />} />
        <Route path="/product/:id" element={<ProductDetailPage products={products} myProductLikes={myProductLikes} toggleProductLike={toggleProductLike} user={user} deleteProduct={deleteProduct} createRoom={createRoom} />} />
        <Route path="/register" element={<RegisterPage addProduct={addProduct} user={user} />} />
        <Route path="/product/:id/edit" element={<EditProductWrapper products={products} updateProduct={updateProduct} user={user} />} />
        <Route path="/community" element={<CommunityPage posts={posts} />} />
        <Route path="/community/:id" element={<CommunityDetailPage posts={posts} myLikes={myLikes} toggleLike={toggleLike} addComment={addComment} user={user} />} />
        <Route path="/community/new" element={<NewPostPage addPost={addPost} user={user} />} />
        <Route path="/login" element={<LoginPage login={login} signup={signup} />} />
        <Route path="/profile" element={<ProfilePage user={user} logout={logout} updateProfile={updateProfile} products={products} myProductLikes={myProductLikes} />} />
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
