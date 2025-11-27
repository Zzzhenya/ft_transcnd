const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./utils/logger');
const PORT = parseInt(process.env.USER_SERVICE_PORT || process.env.PORT || '3001');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';
const fs = require('fs').promises;
const path = require('path');

// ⭐ NEW: Helper function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      isGuest: user.is_guest || false
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Register WebSocket support FIRST
fastify.register(require('@fastify/websocket'));

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Global map to store active WebSocket connections for real-time notifications
// Support multiple tabs: store a Set<WebSocket> per user
const userConnections = new Map(); // userId -> Set<WebSocket>

// Helper function to send real-time notifications
function sendLiveNotification(userId, notification) {
  const set = userConnections.get(parseInt(userId));
  if (!set || set.size === 0) {
    logger.info(`User ${userId} not connected; store-only notification`);
    return false;
  }
  let delivered = 0;
  for (const ws of set) {
    if (ws && typeof ws.send === 'function' && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ type: 'live_notification', data: notification }));
        delivered++;
      } catch (e) {
        try { ws.close(); } catch {}
        set.delete(ws);
      }
    } else {
      set.delete(ws);
    }
  }
  if (set.size === 0) userConnections.delete(parseInt(userId));
  if (delivered > 0) logger.info(`Live notification sent to user ${userId} on ${delivered} tab(s)`);
  return delivered > 0;
}

// Global hook to capture all PUT requests
fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'PUT' && request.url.includes('friend-requests')) {
    console.log('GLOBAL HOOK: PUT friend-requests request detected:', request.url);
    console.log('GLOBAL HOOK: Method:', request.method);
    console.log('GLOBAL HOOK: Headers:', request.headers);
  }
});

// JWT verification decorator
fastify.decorate('authenticate', async function (request, reply) {
  // const tempHeader = request.headers['x-token'];
  // if (tempHeader) {
  //   console.log(`⭐⭐⭐⭐⭐⭐⭐token: ${tempHeader}`)
  // } else {
  //   console.log(`⭐⭐⭐⭐⭐⭐⭐token: NONE`)
  // }
  console.log('AUTHENTICATE MIDDLEWARE - Starting for URL:', request.url);
  try {
    // const authHeader = request.headers.authorization;
    const authHeader = request.headers['x-token'];
    console.log('AUTHENTICATE MIDDLEWARE - Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      console.log('AUTHENTICATE MIDDLEWARE - No auth header, sending 401');
      logger.warn('Authentication failed - No token');
      reply.code(401).send({ message: 'Kein Token bereitgestellt' });
      return;
    }

    // const token = authHeader.split(' ')[1];
    // console.log('AUTHENTICATE MIDDLEWARE - Token extracted, length:', token ? token.length : 'null');
    // const payload = jwt.verify(token, JWT_SECRET);
    const payload = jwt.verify(authHeader, JWT_SECRET);
    console.log('AUTHENTICATE MIDDLEWARE - JWT verified, userId:', payload.userId);

    const user = await User.findById(payload.userId);
    console.log('AUTHENTICATE MIDDLEWARE - User found:', user ? user.username : 'null');
    if (!user) {
      console.log('AUTHENTICATE MIDDLEWARE - User not found, sending 404');
      logger.warn('User not found:', payload.userId);
      reply.code(404).send({ message: 'Benutzer nicht gefunden' });
      return;
    }
    console.log(request.user);
    if (!user.isGuest)
    {
      request.user = {
        userId: payload.userId,
        username: payload.username
      };
      request.userDetails = user;
    }
    // request.userDetails = user;
    console.log('AUTHENTICATE MIDDLEWARE - Success, proceeding to endpoint');
  } catch (err) {
    console.log('AUTHENTICATE MIDDLEWARE - Error:', err.message);
    logger.error('Authentication error:', err.message);
    reply.code(403).send({ message: 'Token invalid or expired: Please login' });
    // reply.code(403).send({ message: 'Token ungültig oder abgelaufen' });
    return;
  }
});

// Register endpoint
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { username, email, password } = request.body;

    logger.info('Registration attempt:', { username, email });

    if (!username || !email || !password) {
      logger.warn('Missing fields');
      return reply.code(400).send({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    const usernameL = username.trim().toLowerCase();
    const emailL = email.trim().toLowerCase();


    // Check if username already exists
    const existingUsername = await User.findByUsername(usernameL);
    if (existingUsername) {
      logger.warn('Username already taken:', usernameL);
      return reply.code(409).send({
        success: false,
        message: `Username "${usernameL}" is already taken. Please choose another.`,
        error: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(emailL);
    if (existingEmail) {
      logger.warn('Email already registered:', emailL);
      return reply.code(409).send({
        success: false,
        message: `Email "${emailL}" is already registered. Please use another email or login.`,
        error: 'Email already exists'
      });
    }

    // Register user mit display_name = username
    const result = await AuthService.register(usernameL, emailL, password, usernameL);

    logger.info('User registered:', { userId: result.user.id, usernameL });

    return reply.code(201).send({
      success: true,
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });

} catch (error) {
    console.error('Registration error:', error);
    
    // Validierungsfehler → 400 Bad Request
    if (error.message && (
        error.message.includes('Username must be') ||
        error.message.includes('Username can only contain') ||
        error.message.includes('Invalid email format') ||
        error.message.includes('contains invalid characters')
    )) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
    
    // Already exists → 409 Conflict
    if (error.message.includes('already')) {
      logger.warn('User already exists:', request.body.username);
      return reply.code(409).send({
        success: false,
        message: error.message
      });
    }

    logger.error('Registration failed:', error);
    return reply.code(500).send({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Login endpoint
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;

    logger.info('Login attempt:', { email });

    if (!email || !password) {
      logger.warn('Missing credentials');
      return reply.code(400).send({
        message: 'Email and password are required'
      });
    }

    const emailL = email.trim().toLowerCase();

    const result = await AuthService.login(emailL, password);

    logger.info('Login successful:', { userId: result.user.id });

    return reply.code(200).send({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    logger.warn('Invalid credentials for:', request.body.email);
    return reply.code(401).send({ message: 'Invalid credentials' });
  }
});

// Guest login endpoint
fastify.post('/auth/guest', async (request, reply) => {
  try {
    const { alias } = request.body || {};

    logger.info('Guest login attempt:', { alias });

    // Generate unique guest ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    const guestId = `${timestamp}${random}`;

    let username;

    // Create username with "guest_" prefix
    if (alias) {
      username = `guest_${alias}`;

      // Check if username already exists
      const existingUser = await User.findByUsername(username);

      if (existingUser) {
        logger.warn('Guest username already taken:', username);
        return reply.code(409).send({
          success: false,
          message: `Username "${alias}" is already taken. Please choose another name.`,
          error: 'Username already exists'
        });
      }

      logger.info('Guest username available:', username);
    } else {
      // No alias provided → guest_xxxxxxxx (always unique)
      username = `guest_${guestId.substring(0, 8)}`;
      logger.info('Generated guest username:', username);
    }

    const email = `${guestId}@guest.local`;

    // Hash a random password
    const password_hash = await bcrypt.hash(guestId, 10);

    // Create guest user
    const guestUser = await User.create({
      username,
      email,
      password: password_hash,
      display_name: username
    });

    logger.info('Guest user created:', { id: guestUser.id, username: guestUser.username });

    // Generate token
    const token = jwt.sign(
      {
        userId: guestUser.id,
        username: guestUser.username,
        isGuest: true
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return reply.code(201).send({
      success: true,
      message: 'Guest user created',
      user: {
        id: guestUser.id,
        username: guestUser.username,
        email: guestUser.email,
        is_guest: true
      },
      token
    });
  } catch (error) {
    logger.error('Guest login error:', error);

    // Fallback: UNIQUE constraint error
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return reply.code(409).send({
        success: false,
        message: 'Username already exists. Please choose another name.',
        error: 'Duplicate username'
      });
    }

    return reply.code(500).send({
      success: false,
      message: 'Failed to create guest user',
      error: error.message
    });
  }
});

// Get profile endpoint (protected)
fastify.get('/auth/profile', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    logger.info('Profile accessed:', request.user.userId);
    const userData = request.userDetails;

    // Filter out sensitive information
    const userWithoutSensitive = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      created_at: userData.created_at,
      is_guest: userData.is_guest,
      bio: userData.bio,
      avatar: userData.avatar,
      user_status: userData.user_status,
      display_name: userData.display_name,
    };

    return reply.send(userWithoutSensitive);
  } catch (error) {
    logger.error('Profile error:', error);
    return reply.code(500).send({ message: 'Serverfehler', error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { service: 'user-service', status: 'healthy', timestamp: new Date() };
});

// DEBUG: WebSocket connections status
fastify.get('/debug/websocket-connections', async (request, reply) => {
  const connections = Array.from(userConnections.entries()).map(([userId, ws]) => ({
    userId,
    readyState: ws.readyState,
    connected: ws.readyState === 1
  }));

  return {
    totalConnections: userConnections.size,
    connections,
    connectionUserIds: Array.from(userConnections.keys())
  };
});

// =============== WEBSOCKET NOTIFICATIONS ===============

// WebSocket endpoint for real-time notifications
console.log('🔔 REGISTERING WEBSOCKET NOTIFICATIONS ENDPOINT: /ws/notifications');
fastify.get('/ws/notifications', { websocket: true }, (connection, req) => {
  console.log('🚀 WEBSOCKET NOTIFICATIONS CONNECTION ATTEMPT');

  // Following game-service pattern: use connection.socket directly
  const ws = connection.socket;

  if (!ws) {
    console.log('🔔 ❌ No socket found in connection');
    return;
  }

  console.log('🔔 ✅ Socket found, readyState:', ws.readyState);

  // Get token from query parameters
  let token = null;
  let isAuthenticated = false;
  let userId = null;
  let username = null;

  // Try to extract token from URL (various methods)
  console.log('🔔 DEBUG: Starting token extraction...');
  console.log('🔔 DEBUG: req.url:', req.url);
  console.log('🔔 DEBUG: req.query:', req.query);

  // Method 1: Direct query parameter (preferred)
  if (req.query && req.query.token) {
    token = req.query.token;
    console.log('🔔 ✅ Token found via req.query.token');
  }

  // Method 2: Parse URL manually
  if (!token && req.url && req.url.includes('token=')) {
    try {
      const urlParts = req.url.split('token=');
      if (urlParts.length > 1) {
        token = decodeURIComponent(urlParts[1].split('&')[0]);
        console.log('🔔 ✅ Token found via manual URL parsing');
      }
    } catch (error) {
      console.log('🔔 DEBUG: Error in manual URL parsing:', error.message);
    }
  }

  console.log('🔔 DEBUG: Final token result:', token ? `Found (${token.length} chars)` : 'NOT FOUND');

  // Try authentication if we have a token
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      userId = payload.userId;
      username = payload.username;
      isAuthenticated = true;

      console.log(`🔔 ✅ WebSocket authenticated: userId=${userId}, username=${username}`);
      logger.info(`WebSocket notification connection authenticated for user ${userId} (${username})`);

      // Store the socket in userConnections (multi-tab)
      const set = userConnections.get(userId) || new Set();
      set.add(ws);
      userConnections.set(userId, set);
      console.log(`🔔 ✅ Stored socket for user ${userId}. Total connections: ${userConnections.size}, tabs: ${set.size}`);
      console.log(`🔔 📊 Current connections map:`, Array.from(userConnections.keys()));

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to notification system',
        userId: userId,
        username: username
      }));
      console.log(`🔔 ✅ Welcome message sent to user ${userId}`);

    } catch (error) {
      console.log('🔔 ❌ Invalid token:', error.message);
      logger.warn('WebSocket notification connection with invalid token:', error.message);
      try {
        if (ws && typeof ws.close === 'function' && ws.readyState === 1) {
          ws.close(1008, 'Invalid token');
        }
      } catch (closeError) {
        console.log('🔔 ⚠️ Error closing WebSocket:', closeError.message);
      }
      return;
    }
  } else {
    console.log('🔔 ⚠️ No token found in URL, waiting for auth message...');

    // Set up a timeout for authentication
    const authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log('🔔 ❌ Authentication timeout - no auth message received');
        try {
          if (ws && typeof ws.close === 'function' && ws.readyState === 1) {
            ws.close(1008, 'Authentication timeout');
          }
        } catch (error) {
          console.log('🔔 ⚠️ Error closing WebSocket:', error.message);
        }
      }
    }, 10000); // Increased to 10 second timeout for auth

    // Listen for auth message
    const authHandler = (data) => {
      console.log('🔔 📨 Received WebSocket message during auth phase:', data.toString().substring(0, 100));
      try {
        const message = JSON.parse(data.toString());
        console.log('🔔 📨 Parsed auth phase message:', message.type);

        if (message.type === 'auth' && message.token) {
          console.log('🔔 🔑 Processing auth message with token length:', message.token.length);
          clearTimeout(authTimeout);

          try {
            const payload = jwt.verify(message.token, JWT_SECRET);
            userId = payload.userId;
            username = payload.username;
            isAuthenticated = true;

            console.log(`🔔 ✅ WebSocket authenticated via message: userId=${userId}, username=${username}`);
            logger.info(`WebSocket notification connection authenticated via message for user ${userId} (${username})`);

            // Store the socket in userConnections (multi-tab)
            const set = userConnections.get(userId) || new Set();
            set.add(ws);
            userConnections.set(userId, set);
            console.log(`🔔 ✅ Stored socket for user ${userId}. Total connections: ${userConnections.size}, tabs: ${set.size}`);
            console.log(`🔔 📊 Current connections map:`, Array.from(userConnections.keys()));

            // Send welcome message
            ws.send(JSON.stringify({
              type: 'connected',
              message: 'Connected to notification system',
              userId: userId,
              username: username
            }));

            // Remove this auth handler and set up normal handler
            ws.off('message', authHandler);
            setupMessageHandler();

          } catch (authError) {
            console.log('🔔 ❌ Invalid token in auth message:', authError.message);
            try {
              if (ws && typeof ws.close === 'function' && ws.readyState === 1) {
                ws.close(1008, 'Invalid token');
              }
            } catch (closeError) {
              console.log('🔔 ⚠️ Error closing WebSocket:', closeError.message);
            }
          }
        }
      } catch (parseError) {
        console.log('🔔 DEBUG: Ignoring non-JSON or non-auth message during auth phase');
      }
    };

    ws.on('message', authHandler);
  }

  // Function to setup normal message handling after authentication
  function setupMessageHandler() {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`🔔 Message from user ${userId}:`, message.type);

        if (message.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error(`🔔 Error parsing message from user ${userId}:`, error);
      }
    });
  }

  // Set up message handler immediately if already authenticated
  if (isAuthenticated) {
    setupMessageHandler();
  }

  // Handle connection close
  ws.on('close', () => {
    if (userId) {
      const set = userConnections.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) userConnections.delete(userId);
      }
      console.log(`🔔 ❌ User ${userId} tab disconnected. Total connections: ${userConnections.size}`);
      logger.info(`WebSocket notification disconnection for user ${userId}`);
    } else {
      console.log(`🔔 ❌ Unauthenticated connection closed`);
    }
  });

  // Handle connection errors
  ws.on('error', (error) => {
    if (userId) {
      console.error(`🔔 WebSocket error for user ${userId}:`, error);
      logger.error(`WebSocket notification error for user ${userId}:`, error);
      const set = userConnections.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) userConnections.delete(userId);
      }
    }
  });
});

// =============== FRIENDS ENDPOINTS ===============

// Get online users
fastify.get('/users/online', async (request, reply) => {
  try {
    logger.info('Getting online users');

    // Query database-service for online users
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        columns: ['id', 'username', 'display_name', 'last_seen'],
        filters: { is_online: 1 },
        limit: 50
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    return { success: true, users: result.data || [] };

  } catch (error) {
    logger.error('Error getting online users:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get user information by ID
fastify.get('/users/:userId', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    console.log(`👤 GETTING USER INFO FOR ${userId}`);
    logger.info(`Getting user info for user ${userId}`);

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        columns: ['id', 'username', 'email', 'created_at'],
        filters: { id: parseInt(userId) },
        limit: 1
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    console.log(`👤 User query result:`, JSON.stringify(result, null, 2));

    if (!result.data || result.data.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const user = result.data[0];
    return {
      success: true,
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };

  } catch (error) {
    logger.error('Error getting user info:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// =============== UPDATED FRIENDS ENDPOINTS WITH ORDERED PAIRS ===============

// Helper function to compute ordered pair
function getOrderedPair(userId1, userId2) {
  const a = Math.min(parseInt(userId1), parseInt(userId2));
  const b = Math.max(parseInt(userId1), parseInt(userId2));
  return { user_a_id: a, user_b_id: b };
}

// Get user's friends (UPDATED for ordered pairs)
fastify.get('/users/:userId/friends', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const userIdInt = parseInt(userId);
    console.log(`👥 GETTING FRIENDS FOR USER ${userId} - START`);
    logger.info(`Getting friends for user ${userId}`);

    // Query for all friend relationships where user is either user_a or user_b
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['user_a_id', 'user_b_id', 'friends_status', 'created_at', 'requester_id'],
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const allFriends = result.data || [];

    // Filter to only include relationships where this user is involved
    const userFriends = allFriends.filter(f =>
      f.user_a_id === userIdInt || f.user_b_id === userIdInt
    );

    console.log(`Found ${userFriends.length} friend relationships for user ${userId}`);

    const friendsWithUsernames = await Promise.all(
      userFriends.map(async (friend) => {
        // Determine who the other user is
        const friendId = friend.user_a_id === userIdInt ? friend.user_b_id : friend.user_a_id;
        const user = await User.findById(friendId);

        // Get online status from database
        const statusResponse = await fetch('http://database-service:3006/internal/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-auth': DB_SERVICE_TOKEN
          },
          body: JSON.stringify({
            table: 'Users',
            columns: ['is_online', 'last_seen'],
            filters: { id: friendId },
            limit: 1
          })
        });

        let online = false;
        let lastSeen = null;
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          const userData = statusResult.data?.[0];
          online = userData?.is_online === 1;
          lastSeen = userData?.last_seen;
        }

        return {
          friend_id: friendId,
          username: user?.username || 'Unknown User',
          online: online,
          lastSeen: lastSeen,
          friends_status: friend.friends_status,
          created_at: friend.created_at
        };
      })
    );

    return { success: true, friends: friendsWithUsernames };

  } catch (error) {
    logger.error('Error getting friends:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get incoming friend requests (UPDATED for ordered pairs)
fastify.get('/users/:userId/friend-requests', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const userIdInt = parseInt(userId);
    logger.info(`Getting friend requests for user ${userId}`);

    // Query all pending friend relationships
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['user_a_id', 'user_b_id', 'requester_id', 'friends_status', 'created_at'],
        filters: { friends_status: 'pending' },
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const allRequests = result.data || [];

    // Filter to only include requests TO this user (where someone else is the requester)
    const userRequests = allRequests.filter(req =>
      (req.user_a_id === userIdInt || req.user_b_id === userIdInt) &&
      req.requester_id !== userIdInt
    );

    console.log(`Found ${userRequests.length} friend requests for user ${userId}`);

    const requestsWithUsernames = await Promise.all(
      userRequests.map(async (req) => {
        const user = await User.findById(req.requester_id);
        return {
          id: req.requester_id,
          username: user?.username || 'Unknown',
          friends_status: req.friends_status,
          created_at: req.created_at
        };
      })
    );

    return { success: true, requests: requestsWithUsernames };

  } catch (error) {
    logger.error('Error getting friend requests:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Send friend request (UPDATED with upsert logic and ordered pairs)
fastify.post('/users/:userId/friends', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 FRIENDS ENDPOINT HIT! Params:', request.params, 'Body:', request.body);
  try {
    const { userId } = request.params;
    const { friend_id, friendUsername } = request.body;
    const requesterId = parseInt(userId);

    console.log('🚀 Processing friend request:', { userId, friend_id, friendUsername });

    let targetId = friend_id;

    // Resolve username to ID if needed
    if (friendUsername && !friend_id) {
      console.log('🚀 Looking up user by username:', friendUsername);
      const friend = await User.findByUsername(friendUsername);
      if (!friend) {
        console.log('🚀 User not found:', friendUsername);
        return reply.code(404).send({ error: `User with username '${friendUsername}' not found` });
      }
      targetId = friend.id;
      logger.info(`Found user ${friendUsername} with ID ${targetId}`);
    } else if (!friend_id && !friendUsername) {
      console.log('🚀 Missing required parameters');
      return reply.code(400).send({ error: 'Either friend_id or friendUsername is required' });
    }

    targetId = parseInt(targetId);

    // Prevent self-friend requests
    if (requesterId === targetId) {
      console.log('🚀 Attempted self-friend request blocked');
      return reply.code(400).send({ error: 'You cannot send a friend request to yourself' });
    }

    // Compute ordered pair
    const { user_a_id, user_b_id } = getOrderedPair(requesterId, targetId);

    console.log(`🚀 Ordered pair: user_a=${user_a_id}, user_b=${user_b_id}, requester=${requesterId}`);
    logger.info(`Creating friend request: user_a=${user_a_id}, user_b=${user_b_id}, requester=${requesterId}`);

    // Step 1: Check if relationship already exists
    const checkResponse = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['id', 'requester_id', 'friends_status'],
        filters: {
          user_a_id: user_a_id,
          user_b_id: user_b_id
        },
        limit: 1
      })
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      logger.error('Database query failed:', checkResponse.status, errorText);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const checkResult = await checkResponse.json();
    const existing = checkResult.data && checkResult.data.length > 0 ? checkResult.data[0] : null;

    // Step 2: Handle based on existing state
    if (existing) {
      console.log('🚀 Found existing relationship:', existing);

      if (existing.friends_status === 'accepted') {
        // Already friends
        return reply.code(200).send({
          success: true,
          message: 'Already friends',
          status: 'accepted'
        });
      }

      if (existing.friends_status === 'pending') {
        // There's a pending request
        if (existing.requester_id === requesterId) {
          // Same person requesting again - idempotent success
          return reply.code(200).send({
            success: true,
            message: 'Friend request already sent',
            status: 'pending'
          });
        } else {
          // OTHER person already requested - auto-accept (mutual interest)
          console.log('🚀 Mutual friend request detected - auto-accepting');

          const updateResponse = await fetch('http://database-service:3006/internal/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-service-auth': DB_SERVICE_TOKEN
            },
            body: JSON.stringify({
              table: 'Friends',
              id: existing.id,
              column: 'friends_status',
              value: 'accepted'
            })
          });

          if (!updateResponse.ok) {
            logger.error('Failed to auto-accept mutual request');
            return reply.code(500).send({ error: 'Failed to process mutual request' });
          }

          // Also update accepted_at timestamp
          await fetch('http://database-service:3006/internal/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-service-auth': DB_SERVICE_TOKEN
            },
            body: JSON.stringify({
              table: 'Friends',
              id: existing.id,
              column: 'accepted_at',
              value: new Date().toISOString()
            })
          });

          return reply.code(200).send({
            success: true,
            message: 'Friend request automatically accepted (mutual interest)',
            status: 'accepted'
          });
        }
      }

      if (existing.friends_status === 'rejected') {
        // Previously rejected - allow retry by updating to pending
        console.log('🚀 Updating rejected request to pending');

        const updateResponse = await fetch('http://database-service:3006/internal/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-auth': DB_SERVICE_TOKEN
          },
          body: JSON.stringify({
            table: 'Friends',
            id: existing.id,
            column: 'friends_status',
            value: 'pending'
          })
        });

        if (!updateResponse.ok) {
          return reply.code(500).send({ error: 'Failed to update request' });
        }

        // Update requester_id
        await fetch('http://database-service:3006/internal/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-auth': DB_SERVICE_TOKEN
          },
          body: JSON.stringify({
            table: 'Friends',
            id: existing.id,
            column: 'requester_id',
            value: requesterId
          })
        });

        return reply.code(200).send({
          success: true,
          message: 'Friend request sent',
          status: 'pending'
        });
      }
    }

    // Step 3: No existing relationship - create new one
    console.log('🚀 Creating new friend request');

    const insertResponse = await fetch('http://database-service:3006/internal/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        action: 'insert',
        values: {
          user_a_id: user_a_id,
          user_b_id: user_b_id,
          requester_id: requesterId,
          friends_status: 'pending'
        }
      })
    });

    console.log('🚀 Database response status:', insertResponse.status);

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.log('🚀 Database error response:', errorText);

      // Check if it's a unique constraint violation (race condition)
      if (errorText.includes('UNIQUE constraint')) {
        // Race condition occurred - return success anyway (idempotent)
        console.log('🚀 Race condition detected, returning success');
        return reply.code(200).send({
          success: true,
          message: 'Friend request processed',
          status: 'pending'
        });
      }

      logger.error('Database insert failed:', insertResponse.status);
      return reply.code(500).send({ error: 'Failed to create friend request' });
    }

    const result = await insertResponse.json();
    console.log('🚀 Database success result:', result);

    return reply.code(201).send({
      success: true,
      message: 'Friend request sent',
      id: result.id,
      status: 'pending'
    });

  } catch (error) {
    logger.error('Error creating friend request:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Accept or reject friend request (UPDATED for ordered pairs)
fastify.put('/users/:userId/friend-requests/:requesterId', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('PUT endpoint hit - starting function');
  try {
    const { userId, requesterId } = request.params;
    const userIdInt = parseInt(userId);
    const requesterIdInt = parseInt(requesterId);

    console.log('PUT /users/:userId/friend-requests/:requesterId - Request params:', { userId, requesterId });
    console.log('PUT /users/:userId/friend-requests/:requesterId - Request body:', request.body);

    const { action } = request.body;

    console.log('PUT /users/:userId/friend-requests/:requesterId - Action extracted:', action);

    if (!action || !['accept', 'reject'].includes(action)) {
      console.log('PUT /users/:userId/friend-requests/:requesterId - Invalid action, sending 400');
      return reply.code(400).send({ error: 'Action must be "accept" or "reject"' });
    }

    logger.info(`User ${userId} ${action}ing friend request from ${requesterId}`);

    // Compute ordered pair
    const { user_a_id, user_b_id } = getOrderedPair(requesterIdInt, userIdInt);

    // Find the friend request
    const findResponse = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['id', 'requester_id', 'friends_status'],
        filters: {
          user_a_id: user_a_id,
          user_b_id: user_b_id
        },
        limit: 1
      })
    });

    if (!findResponse.ok) {
      return reply.code(500).send({ error: 'Could not find friend request' });
    }

    const findData = await findResponse.json();
    if (!findData.success || !findData.data || findData.data.length === 0) {
      return reply.code(404).send({ error: 'Friend request not found' });
    }

    const friendRequest = findData.data[0];

    // Verify this user is the recipient (not the requester)
    if (friendRequest.requester_id === userIdInt) {
      return reply.code(403).send({ error: 'You cannot accept your own friend request' });
    }

    // Verify it's still pending
    if (friendRequest.friends_status !== 'pending') {
      return reply.code(409).send({ error: 'Friend request already processed' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Update status
    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Friends',
        id: friendRequest.id,
        column: 'friends_status',
        value: newStatus
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update friend request' });
    }

    // If accepted, update accepted_at timestamp
    if (action === 'accept') {
      await fetch('http://database-service:3006/internal/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify({
          table: 'Friends',
          id: friendRequest.id,
          column: 'accepted_at',
          value: new Date().toISOString()
        })
      });
    }

    const result = await response.json();

    if (result.changes === 0) {
      return reply.code(404).send({ error: 'Friend request not found or already processed' });
    }

    return {
      success: true,
      message: `Friend request ${action}ed successfully`,
      status: newStatus
    };

  } catch (error) {
    console.log('PUT /users/:userId/friend-requests/:requesterId - Error caught:', error);
    logger.error('Error updating friend request:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Create notification / invite for a user (simple, stored in DB)
fastify.post('/users/:userId/invite', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 INVITE ENDPOINT HIT!', request.params, request.body);
  try {
    const { userId } = request.params;
    const { type, payload } = request.body || {};
    const actorId = request.user.userId;
    const now = Date.now();

    // Basic rate limiting: max 5 invites per 10s per actor
    const rlKey = `invite:${actorId}`;
    global.__inviteRL = global.__inviteRL || new Map();
    const rec = global.__inviteRL.get(rlKey) || { ts: now, cnt: 0 };
    if (now - rec.ts > 10000) { rec.ts = now; rec.cnt = 0; }
    rec.cnt++;
    global.__inviteRL.set(rlKey, rec);
    if (rec.cnt > 5) {
      return reply.code(429).send({ error: 'Too many invites. Please wait.' });
    }

    // Prevent inviting someone already in a game (query game-service)
    try {
      const gs = await fetch('http://game-service:3002/api/players/status?userId=' + encodeURIComponent(userId));
      if (gs.ok) {
        const status = await gs.json();
        if (status.inGame) {
          return reply.code(409).send({ error: 'User is currently in a game' });
        }
      }
    } catch {}

    // Prevent multiple simultaneous pending invites for same recipient
    const existingRes = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
      body: JSON.stringify({
        table: 'Notifications',
        columns: ['id','payload','created_at'],
        filters: { user_id: parseInt(userId), Noti_read: 0, Noti_type: type || 'game_invite' },
        limit: 50
      })
    });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      // expire invites older than 2 minutes
      const toDelete = [];
      for (const n of existing.data || []) {
        const age = now - new Date(n.created_at).getTime();
        if (age > 2 * 60 * 1000) toDelete.push(n.id);
      }
      if (toDelete.length) {
        await fetch('http://database-service:3006/internal/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
          body: JSON.stringify({ table: 'Notifications', filters: { id: toDelete } })
        }).catch(()=>{});
      }
      // if still pending ones exist, block
      if ((existing.data || []).some(n => !toDelete.includes(n.id))) {
        return reply.code(409).send({ error: 'Recipient already has a pending invite' });
      }
    }

    // ✅ NEW: Generate room code and create room in game-service
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    console.log(`🎮 Creating room ${roomCode} in game-service for invite`);
    logger.info(`Creating room ${roomCode} in game-service for invite from ${actorId} to ${userId}`);
    
    try {
      const createRoomRes = await fetch('http://game-service:3002/api/rooms/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomId: roomCode })
      });
      
      if (!createRoomRes.ok) {
        const errorText = await createRoomRes.text();
        logger.error('Failed to create room in game-service:', createRoomRes.status, errorText);
        return reply.code(500).send({ error: 'Failed to create game room' });
      }
      
      const roomResult = await createRoomRes.json();
      console.log(`🎮 ✅ Room created in game-service:`, roomResult);
      logger.info(`Room ${roomCode} created successfully in game-service`);
      
    } catch (e) {
      logger.error('Error creating room in game-service:', e);
      return reply.code(500).send({ error: 'Failed to create game room' });
    }

    const invitationPayload = {
      roomCode,
      inviterName: request.user.username || `User ${actorId}`,
      expiresAt: new Date(now + 2 * 60 * 1000).toISOString(),
      ...(payload || {})
    };

    // Store notification
    const writePayload = {
      table: 'Notifications',
      action: 'insert',
      values: {
        user_id: parseInt(userId),
        actor_id: actorId,
        Noti_type: type || 'game_invite',
        payload: JSON.stringify(invitationPayload),
        Noti_read: 0
      }
    };
    const writeRes = await fetch('http://database-service:3006/internal/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(writePayload)
    });
    if (!writeRes.ok) {
      const errorText = await writeRes.text();
      logger.error('Failed to write notification:', writeRes.status, errorText);
      return reply.code(500).send({ error: 'Failed to create notification', details: errorText });
    }
    const writeResult = await writeRes.json();

    const liveNotification = {
      id: writeResult.id || Date.now(),
      type: type || 'game_invite',
      from: request.user.username || `User ${actorId}`,
      fromId: actorId,
      roomCode,
      payload: invitationPayload,
      timestamp: new Date().toISOString()
    };
    const sentLive = sendLiveNotification(userId, liveNotification);

    return { success: true, message: 'Invitation created', roomCode, sentLive };
  } catch (error) {
    logger.error('Error creating invitation:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get notifications for a user
console.log('🔔 REGISTERING NOTIFICATIONS ENDPOINT: /users/:userId/notifications');
fastify.get('/users/:userId/notifications', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 NOTIFICATIONS ENDPOINT HIT!', request.params);
  try {
    const { userId } = request.params;
    console.log('📨 Getting notifications for user:', userId);

    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'actor_id', 'Noti_type', 'payload', 'Noti_read', 'created_at'],
      filters: { user_id: parseInt(userId) },
      orderBy: { column: 'created_at', direction: 'DESC' },
      limit: 50
    };

    console.log('📨 Query payload:', JSON.stringify(queryPayload, null, 2));

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(queryPayload)
    });

    //console.log('📨 Database response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📨 Database query failed:', response.status, errorText);
      logger.error('Database query failed for notifications:', response.status, errorText);
      return reply.code(500).send({ error: 'Database query failed', details: errorText });
    }

    const result = await response.json();
    console.log('📨 Database result:', JSON.stringify(result, null, 2));

    const responsePayload = { success: true, notifications: result.data || [] };
    console.log('📨 Sending response:', JSON.stringify(responsePayload, null, 2));

    return responsePayload;
  } catch (error) {
    console.error('📨 NOTIFICATIONS ERROR:', error);
    logger.error('Error getting notifications:', error);
    return reply.code(500).send({ error: 'Internal server error', message: error.message });
  }
});

// Get unread notifications for a user (for polling)
console.log('🔔 *** ABOUT TO REGISTER UNREAD ENDPOINT ***');
console.log('🔔 REGISTERING UNREAD NOTIFICATIONS ENDPOINT: /notifications/unread');
fastify.get('/notifications/unread', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 UNREAD NOTIFICATIONS ENDPOINT HIT!');
  try {
    const userId = request.user.userId; // From JWT
    // const userId = request.user.userId? ||request.headers['x-user-id'];

    console.log('📨 Getting unread notifications for user:', userId);

    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'user_id', 'actor_id', 'Noti_type', 'payload', 'created_at', 'Noti_read'],
      filters: {
        user_id: userId,
        Noti_read: 0  // Only unread notifications
      },
      orderBy: 'created_at DESC',
      limit: 50
    };

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Database query failed for unread notifications:', response.status, errorText);
      logger.error('Database query failed for unread notifications:', response.status, errorText);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    console.log('📨 Database response:', JSON.stringify(result, null, 2));
    console.log('📨 Database returned unread notifications:', result.data?.length || 0);
    console.log('📨 Raw notification data:', JSON.stringify(result.data, null, 2));

    // Format notifications with proper data
    const formattedNotifications = (result.data || []).map(notification => {
      let payload = {};
      try {
        const raw = notification.payload;
        if (typeof raw === 'string') payload = JSON.parse(raw);
        else if (raw && typeof raw === 'object') payload = raw;
      } catch (e) {
        payload = { invalid: true };
      }

      // Determine the 'from' field based on notification type
      let fromName = 'Unknown';
      if (notification.Noti_type === 'invitation_declined') {
        fromName = payload.declinerName || 'Unknown';
      } else if (notification.Noti_type === 'invitation_accepted') {
        fromName = payload.accepterName || 'Unknown';
      } else if (notification.Noti_type === 'player_left_room') {
        fromName = payload.leaverName || 'Unknown';
      } else {
        fromName = payload.inviterName || 'Unknown';
      }

      return {
        id: notification.id,
        type: notification.Noti_type,
        from: fromName,
        fromId: notification.actor_id,
        roomCode: payload.roomCode,
        payload: payload,
        timestamp: notification.created_at,
        read: notification.Noti_read === 1
      };
    });

    const responsePayload = {
      success: true,
      notifications: formattedNotifications
    };

    console.log('📨 Returning formatted unread notifications:', formattedNotifications.length);
    console.log('📨 First notification sample:', JSON.stringify(formattedNotifications[0], null, 2));
    return responsePayload;
  } catch (error) {
    console.error('📨 UNREAD NOTIFICATIONS ERROR:', error);
    logger.error('Error getting unread notifications:', error);
    return reply.code(500).send({ error: 'Internal server error', message: error.message });
  }
});

// Accept notification/invitation
console.log('✅ REGISTERING ACCEPT ENDPOINT: /notifications/:notificationId/accept');
fastify.post('/notifications/:notificationId/accept', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 ACCEPT ENDPOINT HIT!', request.params);
  try {
    const { notificationId } = request.params;
    const userId = request.user.userId;

    // Re-check if user is already in a game
    try {
      const gs = await fetch('http://game-service:3002/api/players/status?userId=' + encodeURIComponent(userId));
      if (gs.ok) {
        const status = await gs.json();
        if (status.inGame) return reply.code(409).send({ error: 'You are already in a game' });
      }
    } catch {}

    // Verify notification
    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'user_id', 'actor_id', 'Noti_type', 'payload', 'created_at'],
      filters: { id: parseInt(notificationId), user_id: userId }
    };
    const queryRes = await fetch('http://database-service:3006/internal/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
      body: JSON.stringify(queryPayload)
    });
    if (!queryRes.ok) return reply.code(500).send({ error: 'Failed to verify notification' });
    const queryResult = await queryRes.json();
    if (!queryResult.data || queryResult.data.length === 0) return reply.code(404).send({ error: 'Notification not found' });
    const notification = queryResult.data[0];

    // Parse
    let roomCode = null; let originalInviterId = notification.actor_id; let expiresAt = null;
    try {
      const payloadData = JSON.parse(notification.payload || '{}');
      roomCode = payloadData.roomCode;
      expiresAt = payloadData.expiresAt;
    } catch {}

    // Expire invites older than 2 minutes or with past expiresAt
    const ageOk = notification.created_at && (Date.now() - new Date(notification.created_at).getTime() <= 2*60*1000);
    const notExpired = expiresAt ? (Date.now() <= new Date(expiresAt).getTime()) : ageOk;
    if (!notExpired) {
      // delete stale invite
      await fetch('http://database-service:3006/internal/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
        body: JSON.stringify({ table: 'Notifications', filters: { id: parseInt(notificationId), user_id: userId } })
      }).catch(()=>{});
      return reply.code(410).send({ error: 'Invitation expired' });
    }

    // Validate room exists and inviter presence before proceeding
    if (!roomCode || !originalInviterId) {
      return reply.code(410).send({ error: 'Invalid invitation' });
    }
    try {
      const roomRes = await fetch(`http://game-service:3002/api/rooms/${encodeURIComponent(roomCode)}`);
      if (!roomRes.ok) {
        // room missing → cleanup this invite and return expired
        await fetch('http://database-service:3006/internal/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
          body: JSON.stringify({ table: 'Notifications', filters: { id: parseInt(notificationId), user_id: userId } })
        }).catch(()=>{});
        return reply.code(410).send({ error: 'Invitation expired (room closed)' });
      }
      const room = await roomRes.json();
      const players = Array.isArray(room?.room?.players) ? room.room.players : [];
      const inviterPresent = players.some(p => (
        p?.userId === originalInviterId ||
        (inviterUsername && String(p?.username || '').toLowerCase() === inviterUsername)
      ));
      if (!inviterPresent) {
        await fetch('http://database-service:3006/internal/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
          body: JSON.stringify({ table: 'Notifications', filters: { id: parseInt(notificationId), user_id: userId } })
        }).catch(()=>{});
        return reply.code(410).send({ error: 'Invitation expired (inviter left)' });
      }
    } catch {}

    // Delete ALL other pending invites to avoid double-join
    await fetch('http://database-service:3006/internal/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
      body: JSON.stringify({ table: 'Notifications', filters: { user_id: userId, Noti_read: 0, Noti_type: 'game_invite' } })
    }).catch(()=>{});

    // Delete this notification
    await fetch('http://database-service:3006/internal/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
      body: JSON.stringify({ table: 'Notifications', filters: { id: parseInt(notificationId), user_id: userId } })
    });

    // 🔥 NEW: Send notification to original inviter that invitation was accepted
    if (originalInviterId && roomCode) {
      console.log('✅ CREATING ACCEPTANCE NOTIFICATION:');
      console.log('   - Original inviter ID:', originalInviterId);
      console.log('   - Room code:', roomCode);
      console.log('   - Accepter username:', request.user.username);

      const inviterNotificationPayload = {
        roomCode: roomCode,
        accepterName: request.user.username || `User ${userId}`,
        message: 'Your invitation was accepted!'
      };
      console.log('   - Payload:', JSON.stringify(inviterNotificationPayload));

      const writePayload = {
        table: 'Notifications',
        action: 'insert',
        values: {
          user_id: originalInviterId,     // Notify the original inviter
          actor_id: userId,               // The user who accepted
          Noti_type: 'invitation_accepted',
          payload: JSON.stringify(inviterNotificationPayload),
          Noti_read: 0
        }
      };

      console.log('✅ Database write payload:', JSON.stringify(writePayload, null, 2));

      const writeRes = await fetch('http://database-service:3006/internal/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify(writePayload)
      });

      console.log('✅ Database write response status:', writeRes.status);
      if (writeRes.ok) {
        const writeResult = await writeRes.json();
        console.log('✅ Database write result:', JSON.stringify(writeResult, null, 2));
        console.log('✅ Successfully notified inviter about acceptance');
      } else {
        const errorText = await writeRes.text();
        console.error('✅ Failed to notify inviter about acceptance:', writeRes.status, errorText);
      }
    } else {
      console.log('✅ NOT creating acceptance notification:', {
        originalInviterId,
        roomCode,
        hasOriginalInviter: !!originalInviterId,
        hasRoomCode: !!roomCode
      });
    }

    console.log('✅ Invitation accepted successfully');
    const responseData = {
      success: true,
      message: 'Invitation accepted',
      roomCode: roomCode
    };
    console.log('✅ Sending response:', JSON.stringify(responseData, null, 2));
    return responseData;
  } catch (error) {
    console.error('✅ Error accepting invitation:', error);
    logger.error('Error accepting invitation:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Decline notification/invitation
console.log('❌ REGISTERING DECLINE ENDPOINT: /notifications/:notificationId/decline');
fastify.post('/notifications/:notificationId/decline', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 DECLINE ENDPOINT HIT!', request.params);
  try {
    const { notificationId } = request.params;
    const userId = request.user.userId;

    console.log(`❌ User ${userId} declining notification ${notificationId}`);

    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'user_id', 'actor_id', 'Noti_type', 'payload'],
      filters: {
        id: parseInt(notificationId),
        user_id: userId
      }
    };

    const queryRes = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(queryPayload)
    });

    if (!queryRes.ok) {
      console.error('❌ Failed to query notification:', queryRes.status);
      return reply.code(500).send({ error: 'Failed to verify notification' });
    }

    const queryResult = await queryRes.json();
    console.log('❌ Query result:', JSON.stringify(queryResult, null, 2));

    if (!queryResult.data || queryResult.data.length === 0) {
      console.log('❌ Notification not found or not owned by user');
      return reply.code(404).send({ error: 'Notification not found' });
    }

    const notification = queryResult.data[0];
    const originalInviterId = notification.actor_id; // Who sent the original invitation
    let roomCode = null;

    // Extract room code from payload if it's a game invitation
    if (notification.payload) {
      try {
        const payload = JSON.parse(notification.payload);
        roomCode = payload.roomCode;
        console.log('❌ Extracted room code for decline notification:', roomCode);
      } catch (err) {
        console.log('❌ No valid payload found in notification');
      }
    }

    // Delete the notification (declined)
    const deletePayload = {
      table: 'Notifications',
      filters: {
        id: parseInt(notificationId),
        user_id: userId
      }
    };

    const deleteRes = await fetch('http://database-service:3006/internal/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(deletePayload)
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error('❌ Failed to delete notification:', deleteRes.status, errorText);
      return reply.code(500).send({ error: 'Failed to decline invitation' });
    }

    // 🔥 NEW: Send notification to original inviter that invitation was declined
    if (originalInviterId && roomCode) {
      console.log('❌ CREATING DECLINE NOTIFICATION:');
      console.log('   - Original inviter ID:', originalInviterId);
      console.log('   - Room code:', roomCode);
      console.log('   - Decliner username:', request.user.username);

      const inviterNotificationPayload = {
        roomCode: roomCode,
        declinerName: request.user.username || `User ${userId}`,
        message: 'Your invitation was declined.'
      };
      console.log('   - Payload:', JSON.stringify(inviterNotificationPayload));

      const writePayload = {
        table: 'Notifications',
        action: 'insert',
        values: {
          user_id: originalInviterId,     // Notify the original inviter
          actor_id: userId,               // The user who declined
          Noti_type: 'invitation_declined',
          payload: JSON.stringify(inviterNotificationPayload),
          Noti_read: 0,
          created_at: new Date().toISOString()  // Set current timestamp
        }
      };

      console.log('❌ Database write payload:', JSON.stringify(writePayload, null, 2));

      const writeRes = await fetch('http://database-service:3006/internal/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: JSON.stringify(writePayload)
      });

      console.log('❌ Database write response status:', writeRes.status);
      if (writeRes.ok) {
        const writeResult = await writeRes.json();
        console.log('❌ Database write result:', JSON.stringify(writeResult, null, 2));
        console.log('❌ Successfully notified inviter about decline');
      } else {
        const errorText = await writeRes.text();
        console.error('❌ Failed to notify inviter about decline:', writeRes.status, errorText);
      }
    } else {
      console.log('❌ NOT creating decline notification:', {
        originalInviterId,
        roomCode,
        hasOriginalInviter: !!originalInviterId,
        hasRoomCode: !!roomCode
      });
    }

    console.log('❌ Invitation declined successfully');
    return { success: true, message: 'Invitation declined' };
  } catch (error) {
    console.error('❌ Error declining invitation:', error);
    logger.error('Error declining invitation:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Temporary debug endpoint to check active WebSocket connections
fastify.get('/debug/ws-connections', async (request, reply) => {
  const activeConnections = Array.from(userConnections.keys());
  return {
    totalConnections: userConnections.size,
    activeUserIds: activeConnections,
    timestamp: new Date().toISOString()
  };
});

// Temporary endpoint to test live notifications
fastify.post('/debug/test-notification/:userId', async (request, reply) => {
  const { userId } = request.params;

  const testNotification = {
    id: Date.now(),
    type: 'friend_request',
    from: 'Test User',
    fromId: 999,
    payload: { message: 'This is a test notification!' },
    timestamp: new Date().toISOString()
  };

  console.log(`🧪 Testing notification to user ${userId}`);
  const sent = sendLiveNotification(parseInt(userId), testNotification);

  return {
    success: true,
    sent: sent,
    message: `Test notification ${sent ? 'sent successfully' : 'queued for DB only'}`
  };
});


// TEST PUT ENDPOINT
fastify.put('/test-put', async (request, reply) => {
  console.log('TEST PUT ENDPOINT HIT!');
  return { success: true, message: 'Test PUT works' };
});

console.log('TEST PUT ENDPOINT REGISTERED');

// TEST ENDPOINT
fastify.post('/test-status', async (request, reply) => {
  console.log('🧪 TEST ENDPOINT HIT!');
  return { test: 'working' };
});

// Update user online status
fastify.post('/users/:userId/online-status', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 STATUS ENDPOINT HIT - START OF HANDLER');
  try {
    const { userId } = request.params;
    const { is_online } = request.body;

    console.log(`🟢 ONLINE STATUS UPDATE REQUEST: userId=${userId}, is_online=${is_online}, type=${typeof is_online}`);
    logger.info(`🟢 ONLINE STATUS UPDATE REQUEST: userId=${userId}, is_online=${is_online}, type=${typeof is_online}`);

    if (typeof is_online !== 'number') {
      logger.warn(`❌ Invalid is_online type: expected number, got ${typeof is_online}`);
      return reply.code(400).send({ error: 'is_online must be 0 or 1' });
    }

    logger.info(`🔄 Updating online status for user ${userId} to ${is_online}`);

    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'is_online',
        value: is_online
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update status' });
    }
      const lastSeenResponse = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'last_seen',
        value: new Date().toISOString() // ISO format für SQLite
      })
    });
    
    if (!lastSeenResponse.ok) {
      logger.warn('Failed to update last_seen, but is_online was updated');
    }
    
    console.log(`✅ Updated is_online=${is_online} and last_seen for user ${userId}`);
    logger.info(`✅ Updated is_online=${is_online} and last_seen for user ${userId}`);
    
    return { success: true, message: 'Status and last_seen updated' };

  } catch (error) {
    logger.error('Error updating status:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// =============== DASHBOARD ENDPOINTS ===============

// Get user's remote match history
fastify.get('/users/:userId/remote-matches', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;

    console.log(`🎮 Getting remote matches for user ${userId}`);
    logger.info(`Getting remote matches for user ${userId}`);

    // Query for all finished remote matches
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Remote_Match',
        columns: ['id', 'player1_id', 'player2_id', 'winner_id', 'player1_score', 'player2_score', 'Remote_status', 'finished_at'],
        filters: { Remote_status: 'finished' },
        orderBy: { column: 'finished_at', direction: 'DESC' },
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    let matches = result.data || [];

    // Filter matches where user participated
    matches = matches.filter(match =>
      match.player1_id === parseInt(userId) || match.player2_id === parseInt(userId)
    );

    console.log(`📊 Found ${matches.length} matches for user ${userId}`);

    // Enrich matches with opponent data
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const isPlayer1 = match.player1_id === parseInt(userId);
        const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
        const userScore = isPlayer1 ? match.player1_score : match.player2_score;
        const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;

        // Get opponent username
        const opponent = await User.findById(opponentId);
        const opponentName = opponent?.display_name || opponent?.username || 'Unknown';
        const opponentUserName = opponent?.username || 'Unknown';

        // Determine result
        let result = 'draw';
        if (match.winner_id === parseInt(userId)) {
          result = 'won';
        } else if (match.winner_id === opponentId) {
          result = 'lost';
        }

        return {
          id: match.id,
          opponentId: opponentId,
          opponentName: opponentName,
          opponentUserName: opponentUserName,
          userScore: userScore,
          opponentScore: opponentScore,
          result: result,
          finishedAt: match.finished_at
        };
      })
    );

    return {
      success: true,
      matches: enrichedMatches,
      total: enrichedMatches.length
    };

  } catch (error) {
    logger.error('Error getting remote matches:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get user's tournament participation history
fastify.get('/users/:userId/tournaments', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;

    console.log(`🏆 Getting tournament history for user ${userId}`);
    logger.info(`Getting tournament history for user ${userId}`);

    // Query Tournament_Players table
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Tournament_Players',
        columns: ['tournament_id', 'joined_at'],
        filters: { user_id: parseInt(userId) },
        orderBy: { column: 'joined_at', direction: 'DESC' },
        limit: 50
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const tournaments = result.data || [];

    console.log(`✅ Found ${tournaments.length} tournaments for user ${userId}`);

    return {
      success: true,
      tournaments: tournaments.map(t => ({
        tournamentId: t.tournament_id,
        joinedAt: t.joined_at
      })),
      total: tournaments.length
    };

  } catch (error) {
    logger.error('Error getting tournament history:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get matches for a specific tournament
fastify.get('/tournaments/:tournamentId/matches', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { tournamentId } = request.params;

    console.log(`🏆 Getting matches for tournament ${tournamentId}`);
    logger.info(`Getting matches for tournament ${tournamentId}`);

    // Query Tournament_Matches table
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Tournament_Matches',
        columns: ["id","tournament_id","round","match_number","player1_id","player2_id",
          "winner_id","player1_alias","player2_alias","player1_score","player2_score",
          "matches_status","created_at","finished_at"],
        filters: { tournament_id: parseInt(tournamentId) },
        orderBy: { column: 'round', direction: 'ASC' },
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const matches = result.data || [];

    console.log(`✅ Found ${matches.length} matches for tournament ${tournamentId}`);

    const enrichedMatches = matches.map((match) => {
      let winnerAlias = null;
      if (match.winner_id) {
        if (match.winner_id === match.player1_id) {
          winnerAlias = match.player1_alias;
        } else if (match.winner_id === match.player2_id) {
          winnerAlias = match.player2_alias;
        }
      }

      return {
        id: match.id,
        round: match.round,
        matchNumber: match.match_number,
        player1: {
          id: match.player1_id,
          alias: match.player1_alias
        },
        player2: {
          id: match.player2_id,
          alias: match.player2_alias
        },
        winner: match.winner_id ? {
          id: match.winner_id,
          alias: winnerAlias
        } : null,
        score: {
          player1: match.player1_score,
          player2: match.player2_score
        },
        status: match.matches_status,
        createdAt: match.created_at,
        finishedAt: match.finished_at
      };
    });

    return {
      success: true,
      tournamentId: parseInt(tournamentId),
      matches: enrichedMatches,
      total: enrichedMatches.length
    };

  } catch (error) {
    logger.error('Error getting tournament matches:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// =============== PROFILE CHANGES ===============

// Update user email endpoint
fastify.put('/users/:userId/update-email', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { newEmail, password } = request.body;

    if (parseInt(userId) !== request.user.userId) {
      return reply.code(403).send({ error: 'Unauthorized to update this email' });
    }

    logger.info(`Email update requested for user ${userId}`);

    if (!newEmail || !password) {
      return reply.code(400).send({
        error: 'New email and password are required'
      });
    }

    const emailL = newEmail.trim().toLowerCase();


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailL)) {
      return reply.code(400).send({
        error: 'Invalid email format'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return reply.code(401).send({
        error: 'Incorrect password'
      });
    }

    const existingEmail = await User.findByEmail(emailL);
    if (existingEmail && existingEmail.id !== userId) {
      return reply.code(409).send({
        error: 'Email already in use by another account'
      });
    }

    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'email',
        value: emailL
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update email' });
    }

    logger.info(`Email successfully updated for user ${userId}`);

    return {
      success: true,
      message: 'Email updated successfully',
      email: newEmail
    };

  } catch (error) {
    logger.error('Error updating email:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});


fastify.put('/users/:userId/display-name', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { displayName } = request.body;

    if (request.user.userId !== parseInt(userId)) {
      return reply.code(403).send({ error: 'Unauthorized to update this profile' });
    }

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: 'Alisa name cannot be empty' });
    }

    if (displayName.length > 50) {
      return reply.code(400).send({ error: 'Alisa name must be 50 characters or less' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
      return reply.code(400).send({ error: 'Alisa can only contain letters, numbers, and underscores' });
    }

    const lowerName = displayName.trim().toLowerCase();

    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'display_name',
        value: lowerName
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update display name in database' });
    }

    // ⭐ CRITICAL: Fetch updated user and generate new token
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      return reply.code(404).send({ error: 'User not found after update' });
    }

    const newToken = generateToken(updatedUser);

    logger.info(`Display name updated successfully for user ${userId}`);
    return {
      success: true,
      message: 'Display name updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        display_name: updatedUser.display_name
      },
      token: newToken  // ⭐ Return new token
    };

  } catch (error) {
    logger.error('Error updating display name:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Update username 
fastify.put('/users/:userId/username', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { username } = request.body;

    if (request.user.userId !== parseInt(userId)) {
      return reply.code(403).send({ error: 'Unauthorized to update this profile' });
    }

    if (!username || username.trim().length === 0) {
      return reply.code(400).send({ error: 'Username cannot be empty' });
    }

    const usernameL = username.trim().toLowerCase();

    if (usernameL.length < 3 || usernameL.length > 20) {
      return reply.code(400).send({ error: 'Username must be between 3 and 20 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameL)) {
      return reply.code(400).send({ error: 'Username can only contain letters, numbers, and underscores' });
    }


    // Check if username already exists
    const existingUser = await User.findByUsername(usernameL.trim());
    if (existingUser && existingUser.id !== parseInt(userId)) {
      return reply.code(409).send({ error: 'Username already taken' });
    }

    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'username',
        value: usernameL.trim()
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update username in database' });
    }

    // ⭐ CRITICAL: Fetch updated user and generate new token
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      return reply.code(404).send({ error: 'User not found after update' });
    }

    const newToken = generateToken(updatedUser);

    logger.info(`Username updated successfully for user ${userId}`);
    return {
      success: true,
      message: 'Username updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        display_name: updatedUser.display_name
      },
      token: newToken  // ⭐ Return new token
    };

  } catch (error) {
    logger.error('Error updating username:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Avatar Upload Endpoint
fastify.post('/users/:userId/avatar', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { imageData } = request.body;

    if (parseInt(userId) !== request.user.userId) {
      return reply.code(403).send({ error: 'Unauthorized to update this profile' });
    }

    if (!imageData) {
      return reply.code(400).send({ error: 'No image data provided' });
    }

    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return reply.code(400).send({ error: 'Invalid image format' });
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');

    const avatarsDir = '/app/avatars';
    await fs.mkdir(avatarsDir, { recursive: true });

    const fileName = `${userId}.jpg`;
    const filePath = path.join(avatarsDir, fileName);
    await fs.writeFile(filePath, imageBuffer);

    const avatarUrl = `/avatars/${fileName}`;

    logger.info(`Avatar uploaded for user ${userId}: ${avatarUrl}`);

    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'avatar',
        value: avatarUrl
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update avatar in database' });
    }

    logger.info(`Avatar successfully updated for user ${userId}`);

    return {
      success: true,
      message: 'Avatar updated successfully',
      avatarUrl: avatarUrl
    };

  } catch (error) {
    logger.error('Error updating avatar:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Avatar GET Endpoint
fastify.get('/avatars/:filename', async (request, reply) => {
  try {
    const { filename } = request.params;
    const filePath = path.join('/app/avatars', filename);

    logger.info(`Serving avatar: ${filePath}`);

    try {
      await fs.access(filePath);
      const data = await fs.readFile(filePath);
      reply.type('image/jpeg').send(data);
    } catch (err) {
      logger.warn(`Avatar not found: ${filePath}`);
      reply.code(404).send({ error: 'Avatar not found' });
    }
  } catch (error) {
    logger.error('Error serving avatar:', error);
    reply.code(500).send({ error: 'Internal server error' });
  }
});

// Delete account endpoint
fastify.delete('/auth/account', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const userId = request.user.userId;
    logger.info('Delete account request for user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    if (user.user_status === 'deleted') {
      return reply.code(400).send({
        success: false,
        message: 'Account is already deleted'
      });
    }

    let newUsername = user.username;
    const timestamp = Date.now();
    if (!newUsername.startsWith('deleted_')) {
      newUsername = `deleted_${timestamp}_${user.username}`;
    }

    const newEmail = `deleted_${timestamp}_${userId}@deleted.local`;

    logger.info(`Soft deleting user ${userId}: ${user.username} -> ${newUsername}, ${user.email} -> ${newEmail}`);

    const statusRes = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: userId,
        column: 'user_status',
        value: 'deleted'
      })
    });

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      logger.error('Failed to update status:', statusRes.status, errorText);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update account status'
      });
    }

    const usernameRes = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: userId,
        column: 'username',
        value: newUsername
      })
    });

    if (!usernameRes.ok) {
      const errorText = await usernameRes.text();
      logger.error('Failed to update username:', usernameRes.status, errorText);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update username'
      });
    }

    const emailRes = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        id: userId,
        column: 'email',
        value: newEmail
      })
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      logger.error('Failed to update email:', emailRes.status, errorText);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update email'
      });
    }

    logger.info(`Account successfully deleted: ${userId}`);

    return reply.code(200).send({
      success: true,
      message: 'Account successfully deleted',
      data: {
        oldUsername: user.username,
        newUsername: newUsername,
        oldEmail: user.email,
        newEmail: newEmail,
        user_status: 'deleted'
      }
    });

  } catch (error) {
    logger.error('Error deleting account:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Internal endpoint for game-service to notify room closed → cleanup invites by roomCode
fastify.post('/internal/invites/room-closed', async (request, reply) => {
  try {
    const { roomCode } = request.body || {};
    if (!roomCode) return reply.code(400).send({ error: 'Missing roomCode' });

    // Fetch unread game_invite notifications and delete those with matching roomCode in payload
    const q = await fetch('http://database-service:3006/internal/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
      body: JSON.stringify({
        table: 'Notifications',
        columns: ['id','payload','Noti_read','Noti_type'],
        filters: { Noti_read: 0, Noti_type: 'game_invite' },
        limit: 200
      })
    });
    if (!q.ok) return reply.code(500).send({ error: 'Query failed' });
    const data = await q.json();
    const toDelete = [];
    for (const n of data.data || []) {
      try {
        const p = JSON.parse(n.payload || '{}');
        if (p.roomCode === roomCode) toDelete.push(n.id);
      } catch {}
    }
    if (toDelete.length) {
      await fetch('http://database-service:3006/internal/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-service-auth': DB_SERVICE_TOKEN },
        body: JSON.stringify({ table: 'Notifications', filters: { id: toDelete } })
      }).catch(()=>{});
    }
    return reply.send({ success: true, removed: toDelete.length });
  } catch (e) {
    return reply.code(500).send({ error: 'cleanup failed' });
  }
});

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  logger.error('Unhandled error:', error);
  reply.code(error.statusCode || 500).send({
    message: 'Internal server error',
    error: error.message
  });
});

// Start server (ONLY ONE TIME)
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`🚀 User service running on port ${PORT}`);
    console.log(`🔔 WebSocket notifications endpoint: ws://localhost:${PORT}/ws/notifications`);

    // Log all registered routes for debugging
    console.log('🎯 REGISTERED ROUTES:');
    fastify.printRoutes();

  } catch (err) {
    logger.error('Failed to start:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

// Cleanup stale online users every 2 minutes
setInterval(async () => {
  try {
    console.log('🧹 Running cleanup for stale online users...');
    
    // Get all online users
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify({
        table: 'Users',
        columns: ['id', 'last_seen'],
        filters: { is_online: 1 },
        limit: 1000
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const users = result.data || [];
      const now = new Date();
      let staleCount = 0;
      
      for (const user of users) {
        const lastSeen = new Date(user.last_seen);
        const timeDiff = (now - lastSeen) / 1000; // in seconds
        
        // If last seen more than 2 minutes ago, mark offline
        if (timeDiff > 120) {
          await fetch('http://database-service:3006/internal/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-service-auth': DB_SERVICE_TOKEN
            },
            body: JSON.stringify({
              table: 'Users',
              id: user.id,
              column: 'is_online',
              value: 0
            })
          });
          staleCount++;
          console.log(`🔴 Marked user ${user.id} as offline (last seen ${Math.round(timeDiff)}s ago)`);
        }
      }
      
      if (staleCount > 0) {
        console.log(`🧹 Cleanup complete: ${staleCount} stale users marked offline`);
      }
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}, 120000); // Every 2 minutes

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});