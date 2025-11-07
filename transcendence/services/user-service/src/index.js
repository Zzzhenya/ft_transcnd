const fastify = require('fastify')({ logger: true });
const AuthService = require('./services/authService');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./utils/logger');
const PORT = parseInt(process.env.USER_SERVICE_PORT || process.env.PORT || '3001');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

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
  console.log('AUTHENTICATE MIDDLEWARE - Starting for URL:', request.url);
  try {
    const authHeader = request.headers.authorization;
    console.log('AUTHENTICATE MIDDLEWARE - Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      console.log('AUTHENTICATE MIDDLEWARE - No auth header, sending 401');
      logger.warn('Authentication failed - No token');
      reply.code(401).send({ message: 'Kein Token bereitgestellt' });
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('AUTHENTICATE MIDDLEWARE - Token extracted, length:', token ? token.length : 'null');
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('AUTHENTICATE MIDDLEWARE - JWT verified, userId:', payload.userId);

    const user = await User.findById(payload.userId);
    console.log('AUTHENTICATE MIDDLEWARE - User found:', user ? user.username : 'null');
    if (!user) {
      console.log('AUTHENTICATE MIDDLEWARE - User not found, sending 404');
      logger.warn('User not found:', payload.userId);
      reply.code(404).send({ message: 'Benutzer nicht gefunden' });
      return;
    }

    request.user = {
      userId: payload.userId,
      username: payload.username
    };
    request.userDetails = user;
    console.log('AUTHENTICATE MIDDLEWARE - Success, proceeding to endpoint');
  } catch (err) {
    console.log('AUTHENTICATE MIDDLEWARE - Error:', err.message);
    logger.error('Authentication error:', err.message);
    reply.code(403).send({ message: 'Token ungültig oder abgelaufen' });
    return;
  }
});

// const withTimeout = (promise, ms, errorMessage = 'Operation timed out') => 
//   Promise.race([
//     promise,
//     new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
//   ]);

// fastify.post('/auth/register', async (request, reply) => {
//   try {
//     const { username, email, password } = request.body;

//     logger.info('Registration attempt:', { username, email });

//     if (!username || !email || !password) {
//       logger.warn('Missing fields');
//       return reply.code(400).send({
//         success: false,
//         message: 'Username, email and password are required'
//       });
//     }

//     // DB timeout in ms
//     const DB_TIMEOUT = 3000;

//     // Check if username already exists
//     const existingUsername = await withTimeout(
//       User.findByUsername(username),
//       DB_TIMEOUT,
//       'Username check timed out'
//     );
//     if (existingUsername) {
//       logger.warn('Username already taken:', username);
//       return reply.code(409).send({
//         success: false,
//         message: `Username "${username}" is already taken. Please choose another.`,
//         error: 'Username already exists'
//       });
//     }

//     // Check if email already exists
//     const existingEmail = await withTimeout(
//       User.findByEmail(email),
//       DB_TIMEOUT,
//       'Email check timed out'
//     );
//     if (existingEmail) {
//       logger.warn('Email already registered:', email);
//       return reply.code(409).send({
//         success: false,
//         message: `Email "${email}" is already registered. Please use another email or login.`,
//         error: 'Email already exists'
//       });
//     }

//     // Register user
//     const result = await withTimeout(
//       AuthService.register(username, email, password),
//       DB_TIMEOUT,
//       'User registration timed out'
//     );

//     logger.info('User registered:', { userId: result.user.id, username });

//     return reply.code(201).send({
//       success: true,
//       message: 'User successfully registered',
//       user: result.user,
//       token: result.token
//     });

//   } catch (error) {
//     console.error('Registration error:', error);

//     if (error.message.includes('already')) {
//       logger.warn('User already exists:', request.body.username);
//       return reply.code(409).send({ 
//         success: false, 
//         message: error.message 
//       });
//     }

//     if (error.message.includes('timed out')) {
//       logger.error('DB timeout:', error);
//       return reply.code(504).send({ 
//         success: false, 
//         message: 'Database operation timed out', 
//         error: error.message 
//       });
//     }

//     logger.error('Registration failed:', error);
//     return reply.code(500).send({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// async function proxyUserAction( username, email, password, timeout = 5000) {
//   try {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), timeout);

//     const res = await fetch('http://127.0.0.1:3006/auth/register', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-service-auth': process.env.DB_SERVICE_TOKEN
//       },
//       body: JSON.stringify({ username, email, password }),
//       signal: controller.signal
//     });

//     clearTimeout(timer);

//     if (!res.ok) {
//       // Handle HTTP errors (4xx, 5xx)
//       const errorBody = await res.text();
//       throw new Error(`Database service responded with status ${res.status}: ${errorBody}`);
//     }

//     const data = await res.json();
//     return data;

//   } catch (err) {
//     if (err.name === 'AbortError') {
//       throw new Error('Request to database-service timed out');
//     }
//     // Network errors or other unexpected issues
//     throw new Error(`Failed to register user: ${err.message}`);
//   }
// }

// Register endpoint
// fastify.post('/auth/register', async (request, reply) => {
//   try {
//     const { username, email, password } = request.body;

//     logger.info('Registration attempt:', { username, email });

//     if (!username || !email || !password) {
//       logger.warn('Missing fields');
//       return reply.code(400).send({
//         success: false,
//         message: 'Username, email and password are required'
//       });
//     }


//     // Check if username already exists
//     const existingUsername = await User.findByUsername(username);
//     logger.info(existingUsername);
//     if (existingUsername) {
//       logger.warn('Username already taken:', username);
//       return reply.code(409).send({
//         success: false,
//         message: `Username "${username}" is already taken. Please choose another.`,
//         error: 'Username already exists'
//       });
//     }

//     // Check if email already exists
//     const existingEmail = await User.findByEmail(email);
//     if (existingEmail) {
//       logger.warn('Email already registered:', email);
//       return reply.code(409).send({
//         success: false,
//         message: `Email "${email}" is already registered. Please use another email or login.`,
//         error: 'Email already exists'
//       });
//     }

//     // Register user
//     const result = await AuthService.register(username, email, password);

//     logger.info('User registered:', { userId: result.user.id, username });

//     return reply.code(201).send({
//       success: true,
//       message: 'User successfully registered',
//       user: result.user,
//       token: result.token
//     });

//   } catch (error) {
//     console.error('Registration error:', error);

//     if (error.message.includes('already')) {
//       logger.warn('User already exists:', request.body.username);
//       return reply.code(409).send({ 
//         success: false, 
//         message: error.message 
//       });
//     }

//     logger.error('Registration failed:', error);
//     return reply.code(500).send({ 
//       success: false, 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

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

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      logger.warn('Username already taken:', username);
      return reply.code(409).send({
        success: false,
        message: `Username "${username}" is already taken. Please choose another.`,
        error: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      logger.warn('Email already registered:', email);
      return reply.code(409).send({
        success: false,
        message: `Email "${email}" is already registered. Please use another email or login.`,
        error: 'Email already exists'
      });
    }

    // Register user mit display_name = username
    const result = await AuthService.register(username, email, password, username); // ← NEU: username als display_name

    logger.info('User registered:', { userId: result.user.id, username });

    return reply.code(201).send({
      success: true,
      message: 'User successfully registered',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    console.error('Registration error:', error);
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

    const result = await AuthService.login(email, password);

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
    
    const email = `${guestId}@guest.local`;  // Always unique
    
    // Hash a random password
    const password_hash = await bcrypt.hash(guestId, 10);

    // Create guest user
    const guestUser = await User.create({
      username,
      email,
      password: password_hash, // Using password field as in current schema
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

// =============== FRIENDS ENDPOINTS ===============

// Get online users
fastify.get('/users/online', async (request, reply) => {
  try {
    logger.info('Getting online users');
    
    // Query database-service for online users
    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

// Get user's friends  
fastify.get('/users/:userId/friends', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    console.log(`👥 GETTING FRIENDS FOR USER ${userId} - START`);
    logger.info(`Getting friends for user ${userId}`);

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['friend_id', 'status', 'created_at'],
        filters: { user_id: parseInt(userId) },
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const friends = result.data || [];
    
    // Get usernames and online status for the friends
    const friendsWithUsernames = await Promise.all(
      friends.map(async (friend) => {
        const user = await User.findById(friend.friend_id);
        
        // Get online status from database
        const statusResponse = await fetch('http://database-service:3006/internal/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'Users',
            columns: ['is_online', 'last_seen'],
            filters: { id: friend.friend_id },
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
          
          // Debug logging
          console.log(`🔍 Friend ${friend.friend_id} (${user?.username}) online status: is_online=${userData?.is_online}, calculated=${online}`);
          logger.info(`Friend ${friend.friend_id} (${user?.username}) online status: is_online=${userData?.is_online}, calculated=${online}`);
        } else {
          console.log(`❌ Failed to get online status for friend ${friend.friend_id}: ${statusResponse.status}`);
          logger.warn(`Failed to get online status for friend ${friend.friend_id}: ${statusResponse.status}`);
        }
        
        return {
          ...friend,
          username: user?.username || 'Unknown User',
          online: online,
          lastSeen: lastSeen
        };
      })
    );
    
    return { success: true, friends: friendsWithUsernames };

  } catch (error) {
    logger.error('Error getting friends:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Create notification / invite for a user (simple, stored in DB)
console.log('🎯 REGISTERING INVITE ENDPOINT: /users/:userId/invite');
fastify.post('/users/:userId/invite', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 INVITE ENDPOINT HIT!', request.params, request.body);
  try {
    const { userId } = request.params; // This is the user RECEIVING the invitation
    const { type, payload } = request.body || {};
    const actorId = request.user.userId; // This is the user SENDING the invitation (from JWT)

    console.log(`📨 User ${actorId} inviting user ${userId}`);

    // Insert notification row into Notifications table via database-service
    const writePayload = {
      table: 'Notifications',
      action: 'insert',
      values: {
        user_id: parseInt(userId), // Receiver
        actor_id: actorId,         // Sender (from JWT)
        type: type || 'game_invite',
        payload: payload ? JSON.stringify(payload) : null,
        read: 0
      }
    };
    
    console.log('📨 Writing to database:', JSON.stringify(writePayload, null, 2));
    
    const writeRes = await fetch('http://database-service:3006/internal/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(writePayload)
    });

    console.log('📨 Database write response status:', writeRes.status);

    if (!writeRes.ok) {
      const errorText = await writeRes.text();
      console.error('📨 Failed to write notification:', writeRes.status, errorText);
      logger.error('Failed to write notification:', writeRes.status, errorText);
      return reply.code(500).send({ error: 'Failed to create notification', details: errorText });
    }

    const writeResult = await writeRes.json();
    console.log('📨 Database write result:', JSON.stringify(writeResult, null, 2));

    // Success - return created
    console.log('📨 Invitation created successfully');
    return { success: true, message: 'Invitation created' };
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
      columns: ['id', 'actor_id', 'type', 'payload', 'read', 'created_at'],
      filters: { user_id: parseInt(userId) },
      orderBy: { column: 'created_at', direction: 'DESC' },
      limit: 50
    };
    
    console.log('📨 Query payload:', JSON.stringify(queryPayload, null, 2));

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload)
    });

    console.log('📨 Database response status:', response.status);

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

// Accept notification/invitation
console.log('✅ REGISTERING ACCEPT ENDPOINT: /notifications/:notificationId/accept');
fastify.post('/notifications/:notificationId/accept', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('🚀 ACCEPT ENDPOINT HIT!', request.params);
  try {
    const { notificationId } = request.params;
    const userId = request.user.userId; // From JWT

    console.log(`✅ User ${userId} accepting notification ${notificationId}`);

    // First, verify the notification exists and belongs to the user
    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'user_id', 'type', 'payload'],
      filters: { 
        id: parseInt(notificationId),
        user_id: userId 
      }
    };

    const queryRes = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload)
    });

    if (!queryRes.ok) {
      console.error('✅ Failed to query notification:', queryRes.status);
      return reply.code(500).send({ error: 'Failed to verify notification' });
    }

    const queryResult = await queryRes.json();
    console.log('✅ Query result:', JSON.stringify(queryResult, null, 2));

    if (!queryResult.data || queryResult.data.length === 0) {
      console.log('✅ Notification not found or not owned by user');
      return reply.code(404).send({ error: 'Notification not found' });
    }

    // Mark notification as read and delete it (accepted)
    const deletePayload = {
      table: 'Notifications',
      action: 'delete',
      filters: { 
        id: parseInt(notificationId),
        user_id: userId 
      }
    };

    const deleteRes = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletePayload)
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error('✅ Failed to delete notification:', deleteRes.status, errorText);
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }

    console.log('✅ Invitation accepted successfully');
    return { success: true, message: 'Invitation accepted' };
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
    const userId = request.user.userId; // From JWT

    console.log(`❌ User ${userId} declining notification ${notificationId}`);

    // First, verify the notification exists and belongs to the user
    const queryPayload = {
      table: 'Notifications',
      columns: ['id', 'user_id', 'type', 'payload'],
      filters: { 
        id: parseInt(notificationId),
        user_id: userId 
      }
    };

    const queryRes = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    // Delete the notification (declined)
    const deletePayload = {
      table: 'Notifications',
      action: 'delete',
      filters: { 
        id: parseInt(notificationId),
        user_id: userId 
      }
    };

    const deleteRes = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletePayload)
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error('❌ Failed to delete notification:', deleteRes.status, errorText);
      return reply.code(500).send({ error: 'Failed to decline invitation' });
    }

    console.log('❌ Invitation declined successfully');
    return { success: true, message: 'Invitation declined' };
  } catch (error) {
    console.error('❌ Error declining invitation:', error);
    logger.error('Error declining invitation:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});
 

// Send friend request

// Get incoming friend requests (where I am the friend_id)
fastify.get('/users/:userId/friend-requests', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    logger.info(`Getting friend requests for user ${userId}`);

    const response = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['user_id', 'status', 'created_at'],
        filters: { 
          friend_id: parseInt(userId),
          status: 'pending'
        },
        limit: 100
      })
    });

    if (!response.ok) {
      logger.error('Database query failed:', response.status);
      return reply.code(500).send({ error: 'Database query failed' });
    }

    const result = await response.json();
    const requests = result.data || [];
    
    console.log('CHECKPOINT -1: About to process friend requests with Promise.all, requests:', requests.length);
    
    // Get usernames for the senders
    const requestsWithUsernames = await Promise.all(
      requests.map(async (req) => {
        const user = await User.findById(req.user_id);
        return {
          id: req.user_id,
          username: user?.username || 'Unknown',
          status: req.status,
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

console.log('CHECKPOINT 0: About to register POST /users/:userId/friends endpoint');

fastify.post('/users/:userId/friends', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { friend_id, friendUsername } = request.body;
    
    let finalFriendId = friend_id;
    
    // If friendUsername is provided, find the user ID
    if (friendUsername && !friend_id) {
      const friend = await User.findByUsername(friendUsername);
      if (!friend) {
        return reply.code(404).send({ error: `User with username '${friendUsername}' not found` });
      }
      finalFriendId = friend.id;
      logger.info(`Found user ${friendUsername} with ID ${finalFriendId}`);
    } else if (!friend_id && !friendUsername) {
      return reply.code(400).send({ error: 'Either friend_id or friendUsername is required' });
    }

    logger.info(`Creating friend request from ${userId} to ${finalFriendId}`);

    const response = await fetch('http://database-service:3006/internal/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Friends',
        action: 'insert',
        values: {
          user_id: parseInt(userId),
          friend_id: parseInt(finalFriendId),
          status: 'pending'
        }
      })
    });

    if (!response.ok) {
      logger.error('Database insert failed:', response.status);
      return reply.code(500).send({ error: 'Failed to create friend request' });
    }

    const result = await response.json();
    return { success: true, message: 'Friend request sent', id: result.id };

  } catch (error) {
    logger.error('Error creating friend request:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

console.log('CHECKPOINT 1: Friend request POST endpoint completed');

console.log('ABOUT TO REGISTER PUT ENDPOINT');

// Accept or reject friend request
console.log('REGISTERING PUT ENDPOINT: /users/:userId/friend-requests/:requesterId');
fastify.put('/users/:userId/friend-requests/:requesterId', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  console.log('PUT endpoint hit - starting function');
  try {
    const { userId, requesterId } = request.params;
    
    console.log('PUT /users/:userId/friend-requests/:requesterId - Request params:', { userId, requesterId });
    console.log('PUT /users/:userId/friend-requests/:requesterId - Request body:', request.body);
    
    const { action } = request.body; // 'accept' or 'reject'
    
    console.log('PUT /users/:userId/friend-requests/:requesterId - Action extracted:', action);
    
    if (!action || !['accept', 'reject'].includes(action)) {
      console.log('PUT /users/:userId/friend-requests/:requesterId - Invalid action, sending 400');
      return reply.code(400).send({ error: 'Action must be "accept" or "reject"' });
    }

    logger.info(`User ${userId} ${action}ing friend request from ${requesterId}`);

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    // First, get the friend request ID to update it
    const findResponse = await fetch('http://database-service:3006/internal/query', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-service-auth': 'super_secret_internal_token'
      },
      body: JSON.stringify({
        table: 'Friends',
        columns: ['id'],
        filters: { 
          user_id: parseInt(requesterId),
          friend_id: parseInt(userId),
          status: 'pending'
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

    const friendRequestId = findData.data[0].id;

    // Now update the status using the ID
    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-service-auth': 'super_secret_internal_token'
      },
      body: JSON.stringify({
        table: 'Friends',
        id: friendRequestId,
        column: 'status',
        value: newStatus
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update friend request' });
    }

    const result = await response.json();
    
    if (result.changes === 0) {
      return reply.code(404).send({ error: 'Friend request not found or already processed' });
    }

    // If the friend request was accepted, create the bidirectional relationship
    if (action === 'accept') {
      console.log('Creating bidirectional friendship relationship');
      
      const bidirectionalResponse = await fetch('http://database-service:3006/internal/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-service-auth': 'super_secret_internal_token'
        },
        body: JSON.stringify({
          table: 'Friends',
          action: 'insert',
          values: {
            user_id: parseInt(userId),
            friend_id: parseInt(requesterId),
            status: 'accepted'
          }
        })
      });

      if (!bidirectionalResponse.ok) {
        console.log('Warning: Failed to create bidirectional relationship, but main acceptance succeeded');
      } else {
        console.log('Bidirectional friendship relationship created successfully');
      }
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

console.log('PUT ENDPOINT REGISTERED SUCCESSFULLY');

// TEST PUT ENDPOINT
fastify.put('/test-put', async (request, reply) => {
  console.log('TEST PUT ENDPOINT HIT!');
  return { success: true, message: 'Test PUT works' };
});

console.log('TEST PUT ENDPOINT REGISTERED');

// TEST ENDPOINT - just to verify our code is running
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
      headers: { 'Content-Type': 'application/json' },
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

    return { success: true, message: 'Status updated' };

  } catch (error) {
    logger.error('Error updating status:', error);
    return reply.code(500).send({ error: 'Internal server error' });
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

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`🚀 User service running on port ${PORT}`);
    
    // Log all registered routes for debugging
    console.log('🎯 REGISTERED ROUTES:');
    fastify.printRoutes();
    
  } catch (err) {
    logger.error('Failed to start:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await fastify.close();
  process.exit(0);
});


// Update user email endpoint (protected)
fastify.put('/users/:userId/update-email', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { newEmail, password } = request.body;
    
    // Verify the user is updating their own email
    if (parseInt(userId) !== request.user.userId) {
      return reply.code(403).send({ error: 'Unauthorized to update this email' });
    }
    
    logger.info(`Email update requested for user ${userId}`);
    
    // Validate inputs
    if (!newEmail || !password) {
      return reply.code(400).send({ 
        error: 'New email and password are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return reply.code(400).send({ 
        error: 'Invalid email format' 
      });
    }
    
    // Get current user data to verify password
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return reply.code(401).send({ 
        error: 'Incorrect password' 
      });
    }
    
    // Check if email is already taken
    const existingEmail = await User.findByEmail(newEmail);
    if (existingEmail && existingEmail.id !== userId) {
      return reply.code(409).send({ 
        error: 'Email already in use by another account' 
      });
    }
    
    // Update email in database
    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'email',
        value: newEmail
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

// Update user display name (KEIN PASSWORT NÖTIG)
fastify.put('/users/:userId/display-name', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { displayName } = request.body;
    
    // Verify the user is updating their own profile
    if (parseInt(userId) !== request.user.userId) {
      return reply.code(403).send({ error: 'Unauthorized to update this profile' });
    }

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: 'Display name cannot be empty' });
    }

    if (displayName.length > 50) {
      return reply.code(400).send({ error: 'Display name too long (max 50 characters)' });
    }

    logger.info(`Updating display name for user ${userId} to ${displayName}`);

    // Update display_name in database
    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'display_name',
        value: displayName.trim()
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update display name' });
    }

    logger.info(`Display name updated successfully for user ${userId}`);
    return { 
      success: true, 
      message: 'Display name updated successfully',
      displayName: displayName.trim()
    };

  } catch (error) {
    logger.error('Error updating display name:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Update username (KEIN PASSWORT NÖTIG)
fastify.put('/users/:userId/username', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const { userId } = request.params;
    const { username } = request.body;
    
    // Verify the user is updating their own profile
    if (parseInt(userId) !== request.user.userId) {
      return reply.code(403).send({ error: 'Unauthorized to update this profile' });
    }

    if (!username || username.trim().length === 0) {
      return reply.code(400).send({ error: 'Username cannot be empty' });
    }

    if (username.length < 3 || username.length > 20) {
      return reply.code(400).send({ error: 'Username must be between 3 and 20 characters' });
    }

    // Check if username contains only valid characters (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return reply.code(400).send({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    logger.info(`Updating username for user ${userId} to ${username}`);

    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser && existingUser.id !== parseInt(userId)) {
      return reply.code(409).send({ 
        error: 'Username already taken',
        message: 'This username is already in use' 
      });
    }

    // Update username in database
    const response = await fetch('http://database-service:3006/internal/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'Users',
        id: parseInt(userId),
        column: 'username',
        value: username.trim()
      })
    });

    if (!response.ok) {
      logger.error('Database update failed:', response.status);
      return reply.code(500).send({ error: 'Failed to update username' });
    }

    logger.info(`Username updated successfully for user ${userId}`);
    return { 
      success: true, 
      message: 'Username updated successfully',
      username: username.trim()
    };

  } catch (error) {
    logger.error('Error updating username:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

start();