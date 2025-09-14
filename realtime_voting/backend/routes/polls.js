import express from 'express';
import Joi from 'joi';
import prisma from '../config/database.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const createPollSchema = Joi.object({
  question: Joi.string().min(5).max(500).required(),
  options: Joi.array().items(
    Joi.string().min(1).max(200).required()
  ).min(2).max(10).required(),
  isPublished: Joi.boolean().default(false)
});

const updatePollSchema = Joi.object({
  question: Joi.string().min(5).max(500),
  isPublished: Joi.boolean()
});

/**
 * @route POST /api/polls
 * @desc Create a new poll
 * @access Private
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { error, value } = createPollSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    const { question, options, isPublished } = value;

    // Create poll with options in a transaction
    const poll = await prisma.$transaction(async (prisma) => {
      // Create the poll
      const createdPoll = await prisma.poll.create({
        data: {
          question,
          isPublished: isPublished || false,
          creatorId: req.user.userId
        }
      });

      // Create poll options
      const pollOptions = await Promise.all(
        options.map(option => 
          prisma.pollOption.create({
            data: {
              text: option,
              pollId: createdPoll.id
            }
          })
        )
      );

      return {
        ...createdPoll,
        options: pollOptions,
        _count: { votes: 0 }
      };
    });

    res.status(201).json({
      message: 'Poll created successfully',
      poll
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/polls
 * @desc Get all published polls
 * @access Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = userId ? 
      { creatorId: userId } : 
      { isPublished: true };

    const polls = await prisma.poll.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { options: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    // Get total count for pagination
    const totalPolls = await prisma.poll.count({
      where: whereClause
    });

    // Calculate vote totals and format response
    const formattedPolls = polls.map(poll => ({
      id: poll.id,
      question: poll.question,
      isPublished: poll.isPublished,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      creator: poll.creator,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      })),
      totalVotes: poll.options.reduce((sum, option) => sum + option._count.votes, 0),
      optionCount: poll._count.options
    }));

    res.json({
      polls: formattedPolls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPolls / limit),
        totalPolls,
        hasNext: (page * limit) < totalPolls,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/polls/:id
 * @desc Get a specific poll by ID
 * @access Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
      return res.status(404).json({ 
        error: 'Poll not found' 
      });
    }

    // Check if poll is published or if user is the creator
    const isOwner = req.user?.userId === poll.creatorId;
    if (!poll.isPublished && !isOwner) {
      return res.status(403).json({ 
        error: 'Poll is not published' 
      });
    }

    const formattedPoll = {
      id: poll.id,
      question: poll.question,
      isPublished: poll.isPublished,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      creator: poll.creator,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      })),
      totalVotes: poll.options.reduce((sum, option) => sum + option._count.votes, 0)
    };

    res.json({ poll: formattedPoll });

  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/polls/:id
 * @desc Update a poll (only by creator)
 * @access Private
 */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate request body
    const { error, value } = updatePollSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }

    // Check if poll exists and user is the creator
    const existingPoll = await prisma.poll.findUnique({
      where: { id }
    });

    if (!existingPoll) {
      return res.status(404).json({ 
        error: 'Poll not found' 
      });
    }

    if (existingPoll.creatorId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Not authorized to update this poll' 
      });
    }

    // Update poll
    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: value,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        }
      }
    });

    const formattedPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      isPublished: updatedPoll.isPublished,
      createdAt: updatedPoll.createdAt,
      updatedAt: updatedPoll.updatedAt,
      creator: updatedPoll.creator,
      options: updatedPoll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes
      })),
      totalVotes: updatedPoll.options.reduce((sum, option) => sum + option._count.votes, 0)
    };

    res.json({
      message: 'Poll updated successfully',
      poll: formattedPoll
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/polls/:id
 * @desc Delete a poll (only by creator)
 * @access Private
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if poll exists and user is the creator
    const existingPoll = await prisma.poll.findUnique({
      where: { id },
      include: {
        _count: {
          select: { options: true }
        }
      }
    });

    if (!existingPoll) {
      return res.status(404).json({ 
        error: 'Poll not found' 
      });
    }

    if (existingPoll.creatorId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Not authorized to delete this poll' 
      });
    }

    await prisma.poll.delete({
      where: { id }
    });

    res.json({
      message: 'Poll deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

export default router;