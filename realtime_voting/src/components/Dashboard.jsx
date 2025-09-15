import { useState, useEffect } from 'react';
import { Plus, Eye, Users, BarChart3, Clock, User } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

function Dashboard({ token, user, onNavigate }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my-polls'

  useEffect(() => {
    fetchPolls();
  }, [activeTab]);

  const fetchPolls = async () => {
    setLoading(true);
    setError('');

    try {
      const url = activeTab === 'my-polls' 
        ? `${API_BASE}/api/polls?userId=${user?.id}`
        : `${API_BASE}/api/polls`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setPolls(data.polls || []);
      } else {
        setError(data.error || 'Failed to fetch polls');
      }
    } catch (error) {
      setError('Network error. Please check if the backend server is running.');
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user?.name}!</p>
      </div>

      {/* Create Poll Button */}
      <div className="mb-6">
        <button
          onClick={() => onNavigate('create')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Poll
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Polls
            </button>
            <button
              onClick={() => setActiveTab('my-polls')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-polls'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Polls
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {activeTab === 'my-polls' ? 'No polls created yet' : 'No polls available'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'my-polls' 
              ? 'Get started by creating a new poll.' 
              : 'Check back later for new polls to vote on.'}
          </p>
          {activeTab === 'my-polls' && (
            <div className="mt-6">
              <button
                onClick={() => onNavigate('create')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first poll
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{poll.creator?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(poll.createdAt)}
                  </div>
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-4 line-clamp-2">
                  {poll.question}
                </h3>

                <div className="space-y-2 mb-4">
                  {poll.options?.slice(0, 3).map((option) => {
                    const percentage = getVotePercentage(option.voteCount, poll.totalVotes);
                    return (
                      <div key={option.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate mr-2">{option.text}</span>
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-500 min-w-0 text-xs">{option.voteCount}</span>
                        </div>
                      </div>
                    );
                  })}
                  {poll.options?.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{poll.options.length - 3} more options
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    {poll.totalVotes || 0} votes
                  </div>
                  <button
                    onClick={() => onNavigate('poll', poll.id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
