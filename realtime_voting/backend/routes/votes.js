import express from 'express';
import Joi from 'joi';
import prisma from '../config/database.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const voteSchema = Joi.object({
  pollOptionId: Joi.string().required()
});

/**
 * @route POST /api/votes
 * @desc Cast a vote on a poll option
 * @access Private
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { error, value } = voteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    const { pollOptionId } = value;
    const userId = req.user.userId;

    const pollOption = await prisma.pollOption.findUnique({
      where: { id: pollOptionId },
      include: {
        poll: {
          select: {
            id: true,
            question: true,
            isPublished: true,
            creatorId: true
          }
        }
      }
    });

    if (!pollOption) {
      return res.status(404).json({ 
        error: 'Poll option not found' 
      });
    }

    if (!pollOption.poll.isPublished) {
      return res.status(403).json({ 
        error: 'Cannot vote on unpublished poll' 
      });
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollOptionId: {
          userId,
          pollOptionId
        }
      }
    });

    if (existingVote) {
      return res.status(400).json({ 
        error: 'You have already voted on this option' 
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const vote = await prisma.vote.create({
        data: {
          userId,
          pollOptionId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          pollOption: {
            select: {
              id: true,
              text: true,
              pollId: true
            }
          }
        }
      });

      const updatedPollResults = await prisma.poll.findUnique({
        where: { id: pollOption.poll.id },
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

      return { vote, updatedPollResults };
    });

    const pollResults = {
      pollId: result.updatedPollResults.id,
      question: result.updatedPollResults.question,
      options: result.updatedPollResults.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      })),
      totalVotes: result.updatedPollResults.options.reduce((sum, option) => sum + option._count.votes, 0)
    };

    req.io.to(`poll:${pollOption.poll.id}`).emit('pollUpdated', pollResults);

    res.status(201).json({
      message: 'Vote cast successfully',
      vote: {
        id: result.vote.id,
        createdAt: result.vote.createdAt,
        user: result.vote.user,
        pollOption: result.vote.pollOption
      },
      pollResults
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/votes/:id
 * @desc Remove a vote (user can only remove their own vote)
 * @access Private
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const vote = await prisma.vote.findUnique({
      where: { id },
      include: {
        pollOption: {
          include: {
            poll: {
              select: {
                id: true,
                question: true,
                isPublished: true
              }
            }
          }
        }
      }
    });

    if (!vote) {
      return res.status(404).json({ 
        error: 'Vote not found' 
      });
    }

    if (vote.userId !== userId) {
      return res.status(403).json({ 
        error: 'Not authorized to remove this vote' 
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      await prisma.vote.delete({
        where: { id }
      });

      const updatedPollResults = await prisma.poll.findUnique({
        where: { id: vote.pollOption.poll.id },
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

      return updatedPollResults;
    });

    const pollResults = {
      pollId: result.id,
      question: result.question,
      options: result.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      })),
      totalVotes: result.options.reduce((sum, option) => sum + option._count.votes, 0)
    };

    req.io.to(`poll:${vote.pollOption.poll.id}`).emit('pollUpdated', pollResults);

    res.json({
      message: 'Vote removed successfully',
      pollResults
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/votes/user/:userId
 * @desc Get all votes by a specific user
 * @access Private (user can only see their own votes unless admin)
 */
router.get('/user/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.userId;

    if (userId !== requestingUserId) {
      return res.status(403).json({ 
        error: 'Not authorized to view these votes' 
      });
    }

    const votes = await prisma.vote.findMany({
      where: { userId },
      include: {
        pollOption: {
          include: {
            poll: {
              select: {
                id: true,
                question: true,
                creator: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedVotes = votes.map(vote => ({
      id: vote.id,
      createdAt: vote.createdAt,
      pollOption: {
        id: vote.pollOption.id,
        text: vote.pollOption.text
      },
      poll: vote.pollOption.poll
    }));

    res.json({
      votes: formattedVotes,
      totalVotes: votes.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/votes/poll/:pollId
 * @desc Get all votes for a specific poll (for poll creators)
 * @access Private
 */
router.get('/poll/:pollId', auth, async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.userId;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        question: true,
        creatorId: true
      }
    });

    if (!poll) {
      return res.status(404).json({ 
        error: 'Poll not found' 
      });
    }

    if (poll.creatorId !== userId) {
      return res.status(403).json({ 
        error: 'Not authorized to view votes for this poll' 
      });
    }

    const votes = await prisma.vote.findMany({
      where: {
        pollOption: {
          pollId: pollId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pollOption: {
          select: {
            id: true,
            text: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      poll: {
        id: poll.id,
        question: poll.question
      },
      votes: votes.map(vote => ({
        id: vote.id,
        createdAt: vote.createdAt,
        user: vote.user,
        pollOption: vote.pollOption
      })),
      totalVotes: votes.length
    });

  } catch (error) {
    next(error);
  }
});

export default router;