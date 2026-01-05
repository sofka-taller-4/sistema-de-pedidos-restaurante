import { createProxyMiddleware } from 'http-proxy-middleware';

const NODE_MS_URL = process.env.NODE_MS_URL || 'http://node-ms:3002';
const NODE_WS_URL = NODE_MS_URL.replace(/^http/, 'ws').replace(':3002', ':4000');

export const websocketProxy = createProxyMiddleware({
  target: NODE_WS_URL,
  changeOrigin: true,
  ws: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔌 WebSocket proxy request:', req.url);
  },
  onError: (err, req, res) => {
    console.error('❌ WebSocket proxy error:', err);
  },
  onProxyReqWs: (proxyReq, req, socket, options) => {
    console.log('🔌 WebSocket upgrade request:', req.url);
  }
});
