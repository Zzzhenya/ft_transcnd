// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"
import { proxyRequest } from '../utils/proxyHandler.js';
import fp from 'fastify-plugin';

import gatewayError from '../utils/gatewayError.js';
import logger from '../utils/logger.js'; // log-service

import type {  } from '@fastify/websocket'

import WebSocket from 'ws'

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';
const GAME_SERVICE_WS_URL = GAME_SERVICE_URL.replace('http://', 'ws://');
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const USER_SERVICE_WS_URL = USER_SERVICE_URL.replace('http://', 'ws://');

export function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.onopen = () =>
    {
      console.log('WebSocket Open')
      resolve(ws)
    }
    ws.onerror = (err) =>
    {
      console.error('Websocket error: ', err)
      reject(err)
    }
  })
}

export function forwardMessages (
  clientSocket: WebSocket, 
  backendSocket: WebSocket
  ) {

  console.log('Setting up message forwarding...');
  // Forward from client -> backend
  clientSocket.on('message', (msg) => {
    if (backendSocket.readyState === WebSocket.OPEN) {
      try {
        const parsed = JSON.parse(msg.toString()); // Ensure text
        backendSocket.send(JSON.stringify(parsed)); // Force stringified JSON
      } catch (err) {
        console.error('Invalid JSON from client:', err);
      }
    }
  })

  // Forward from backend -> client
  backendSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        // not necessary to parse but doing all the same
        const parsed = JSON.parse(msg.toString()); // Ensure text
        clientSocket.send(JSON.stringify(parsed)); // Force stringified JSON
      } catch (err) {
        console.error('Invalid JSON from game-service:', msg);
      }
    }
  })

  // Handle closures
  const closeBoth = () => {
    // if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close()
    // if (backendSocket.readyState === WebSocket.OPEN) backendSocket.close()
    console.log('Close both connections')
    
    try {
      if (clientSocket && typeof clientSocket.close === 'function') {
        if (clientSocket.readyState === WebSocket.OPEN){
          clientSocket.close();
        }
      }
    } catch (error) {
      console.error('❌ Error closing client socket:', error)
    }

    try {
      if (backendSocket && backendSocket.readyState === WebSocket.OPEN){
        backendSocket.close()
      }
    } catch (error) {
      console.error('❌ Error closing backend socket:', error)
    }

  }

  // if (clientSocket && typeof clientSocket.on === 'function') {
  //   clientSocket.on('close', closeBoth)
  //   console.log('Client disconnected the ws connection')
  // }

  // backendSocket.on('close', closeBoth)
  // console.log('Backend disconnected the ws connection')

  const pingInterval = setInterval(() => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.ping();
    }
    if (backendSocket.readyState === WebSocket.OPEN) {
      backendSocket.ping();
    }
  }, 30_000); // every 30s

  // ⛔️ Stop the interval when either side disconnects
  const clear = () => clearInterval(pingInterval);
  clientSocket.on('close', clear);
  backendSocket.on('close', clear);
}


interface GameParams {
  gameId: string;
}



const wsNotificationRoute: FastifyPluginAsync = async (fastify) => {
  console.log('🔔 Registering WebSocket proxy routes...');
  fastify.log.info('🔔 Registering WebSocket proxy routes...');
  
  // WebSocket route for user-service notifications
  fastify.get('/notifications', { websocket: true }, async (connection, req) => {
    console.log('🔔 WebSocket notification request received:', req.url);
    fastify.log.info('🔔 WebSocket notification request received for: ' + req.url);
    
    const clientSocket = connection;
    
    // Extract token from query parameters
    let token = null;
    if (req.url) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      token = url.searchParams.get('token');
    }
    
    if (!token) {
      fastify.log.error('Missing token in WebSocket notification request');
      clientSocket.close();
      return;
    }
    
    // Create backend WebSocket URL with token
    const backendUrl = `ws://user-service:3001/ws/notifications?token=${encodeURIComponent(token)}`;
    
    try {
      const backendSocket = await createBackendSocket(backendUrl);
      fastify.log.info('🔔 ✅ Notification WebSocket proxy connected');
      forwardMessages(clientSocket, backendSocket);
    } catch (err) {
      fastify.log.error('🔔 ❌ Failed to connect to backend for notifications: ' + String(err));
      clientSocket.close();
    }
  });
}

export default wsNotificationRoute


