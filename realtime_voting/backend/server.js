import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import userRoutes from './routes/users.js';
import pollRoutes from './routes/polls.js';
import voteRoutes from './routes/votes.js';

import { registerHandlers } from './socket/socketHandlers.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(helmet()); 
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/users', userRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'P2002') {
    return res.status(400).json({ 
      error: 'Duplicate entry - this record already exists' 
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({ 
      error: 'Record not found' 
    });
  }
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  registerHandlers(socket, io);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Polling API available at http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket server ready for real-time updates`);
});

export default app;