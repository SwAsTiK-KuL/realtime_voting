import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export function registerHandlers(socket, io) {
  
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data;
      
      if (!token) {
        socket.emit('authError', { error: 'No token provided' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!user) {
        socket.emit('authError', { error: 'User not found' });
        return;
      }

      socket.userId = user.id;
      socket.userInfo = user;
      
      socket.emit('authenticated', { 
        user: user,
        message: 'Socket authenticated successfully' 
      });

      console.log(`Socket ${socket.id} authenticated for user ${user.name}`);

    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authError', { 
        error: 'Authentication failed',
        details: error.message 
      });
    }
  });


  socket.on('joinPoll', async (data) => {
    try {
      const { pollId } = data;

      if (!pollId) {
        socket.emit('error', { error: 'Poll ID is required' });
        return;
      }

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            include: {
              _count: {
                select: { votes: true }
              }
            }
          }
        }
      });

      if (!poll) {
        socket.emit('error', { error: 'Poll not found' });
        return;
      }

      const isCreator = socket.userId && socket.userId === poll.creatorId;
      if (!poll.isPublished && !isCreator) {
        socket.emit('error', { error: 'Poll is not published' });
        return;
      }

      const roomName = `poll:${pollId}`;
      socket.join(roomName);

      const pollResults = {
        pollId: poll.id,
        question: poll.question,
        options: poll.options.map(option => ({
          id: option.id,
          text: option.text,
          voteCount: option._count.votes
        })),
        totalVotes: poll.options.reduce((sum, option) => sum + option._count.votes, 0),
        isPublished: poll.isPublished,
        createdAt: poll.createdAt
      };

      socket.emit('joinedPoll', {
        message: `Joined poll: ${poll.question}`,
        poll: pollResults
      });

      socket.to(roomName).emit('userJoined', {
        message: socket.userInfo ? 
          `${socket.userInfo.name} joined the poll` : 
          'A user joined the poll'
      });

      console.log(`Socket ${socket.id} joined poll room: ${roomName}`);

    } catch (error) {
      console.error('Join poll error:', error);
      socket.emit('error', { 
        error: 'Failed to join poll',
        details: error.message 
      });
    }
  });

  socket.on('leavePoll', (data) => {
    try {
      const { pollId } = data;

      if (!pollId) {
        socket.emit('error', { error: 'Poll ID is required' });
        return;
      }

      const roomName = `poll:${pollId}`;
      socket.leave(roomName);

      socket.to(roomName).emit('userLeft', {
        message: socket.userInfo ? 
          `${socket.userInfo.name} left the poll` : 
          'A user left the poll'
      });

      socket.emit('leftPoll', {
        message: `Left poll room`,
        pollId
      });

      console.log(`Socket ${socket.id} left poll room: ${roomName}`);

    } catch (error) {
      console.error('Leave poll error:', error);
      socket.emit('error', { 
        error: 'Failed to leave poll',
        details: error.message 
      });
    }
  });

  socket.on('getPollStats', async (data) => {
    try {
      const { pollId } = data;

      if (!pollId) {
        socket.emit('error', { error: 'Poll ID is required' });
        return;
      }

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            include: {
              _count: {
                select: { votes: true }
              }
            }
          },
          _count: {
            select: {
              options: true
            }
          }
        }
      });

      if (!poll) {
        socket.emit('error', { error: 'Poll not found' });
        return;
      }

      const stats = {
        pollId: poll.id,
        question: poll.question,
        totalOptions: poll._count.options,
        totalVotes: poll.options.reduce((sum, option) => sum + option._count.votes, 0),
        options: poll.options.map(option => ({
          id: option.id,
          text: option.text,
          voteCount: option._count.votes,
          percentage: poll.options.reduce((sum, opt) => sum + opt._count.votes, 0) > 0 ?
            Math.round((option._count.votes / poll.options.reduce((sum, opt) => sum + opt._count.votes, 0)) * 100) : 0
        })),
        isPublished: poll.isPublished,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      };

      socket.emit('pollStats', stats);

    } catch (error) {
      console.error('Get poll stats error:', error);
      socket.emit('error', { 
        error: 'Failed to get poll statistics',
        details: error.message 
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket ${socket.id} disconnected: ${reason}`);
    
    if (socket.userInfo) {
      console.log(`User ${socket.userInfo.name} (${socket.userInfo.email}) disconnected`);
    }
  });

  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
}