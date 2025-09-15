import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, User, Check } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3001';

function PollView({ pollId, token, user, onNavigate }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (pollId) {
      fetchPoll();
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [pollId]);

  const initializeSocket = () => {
    const newSocket = io(API_BASE);
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      if (token) {
        newSocket.emit('authenticate', { token });
      }
    });

    newSocket.on('authenticated', () => {
      console.log('Socket authenticated');
      if (pollId) {
        newSocket.emit('joinPoll', { pollId });
      }
    });

    newSocket.on('pollUpdated', (updatedResults) => {
      console.log('Poll updated:', updatedResults);
      setPoll(prevPoll => ({
        ...prevPoll,
        options: updatedResults.options,
        totalVotes: updatedResults.totalVotes
      }));
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);
  };

  const fetchPoll = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/polls/${pollId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setPoll(data.poll);
        // Check if user has already voted
        checkUserVote();
      } else {
        setError(data.error || 'Failed to fetch poll');
      }
    } catch (error) {
      setError('Network error. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const checkUserVote = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/votes/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const votes = data.votes || [];
        const pollVote = votes.find(vote => 
          poll?.options?.some(option => option.id === vote.pollOption.id)
        );
        if (pollVote) {
          setUserVote(pollVote.pollOption.id);
        }
      }
    } catch (error) {
      console.error('Error checking user vote:', error);
    }
  };

  const handleVote = async (optionId) => {
    if (voting || userVote) return;

    setVoting(true);
    try {
      const response = await fetch(`${API_BASE}/api/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pollOptionId: optionId })
      });

      const data = await response.json();

      if (response.ok) {
        setUserVote(optionId);
        // Update will come through WebSocket
      } else {
        setError(data.error || 'Failed to cast vote');
      }
    } catch (error) {
      setError('Network error while voting.');
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVotePercentage = (voteCount, totalVotes) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('dashboard')}
          className="mb-4 inline-flex items-center text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('dashboard')}
          className="mb-4 inline-flex items-center text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="text-center py-12">
          <p className="text-gray-500">Poll not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="mb-6 inline-flex items-center text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </button>

      {/* Poll Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{poll.question}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Created by {poll.creator?.name || 'Unknown'}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(poll.createdAt)}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {poll.totalVotes || 0} votes
                </div>
              </div>
            </div>
          </div>

          {/* Voting Options */}
          <div className="space-y-4">
            {poll.options?.map((option) => {
              const percentage = getVotePercentage(option.voteCount, poll.totalVotes);
              const isUserVote = userVote === option.id;
              const hasVoted = userVote !== null;

              return (
                <div
                  key={option.id}
                  className={`relative border rounded-lg p-4 transition-all ${
                    hasVoted
                      ? isUserVote
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50'
                      : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                  }`}
                  onClick={() => !hasVoted && handleVote(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      {isUserVote && (
                        <Check className="h-5 w-5 text-indigo-600 mr-2" />
                      )}
                      <span className={`font-medium ${isUserVote ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {option.text}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">
                        {option.voteCount} votes ({percentage}%)
                      </span>
                    </div>
                  </div>
                  
                  {/* Vote Bar */}
                  {hasVoted && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isUserVote ? 'bg-indigo-600' : 'bg-gray-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Voting Status */}
          {userVote ? (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  You have voted! Results update in real-time.
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                Click on an option to cast your vote. Results will update in real-time for all viewers.
              </p>
            </div>
          )}

          {voting && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center text-indigo-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Casting your vote...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PollView;