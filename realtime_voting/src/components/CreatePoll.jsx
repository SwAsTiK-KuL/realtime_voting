import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

function CreatePoll({ token, onNavigate }) {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    isPublished: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuestionChange = (e) => {
    setFormData(prev => ({
      ...prev,
      question: e.target.value
    }));
    if (error) setError('');
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
    if (error) setError('');
  };

  const addOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        options: newOptions
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.question.trim().length < 5) {
      setError('Question must be at least 5 characters long');
      setLoading(false);
      return;
    }

    const validOptions = formData.options.filter(option => option.trim().length > 0);
    if (validOptions.length < 2) {
      setError('Please provide at least 2 options');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: formData.question.trim(),
          options: validOptions,
          isPublished: formData.isPublished
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate back to dashboard or to the created poll
        onNavigate('dashboard');
      } else {
        setError(data.error || 'Failed to create poll');
      }
    } catch (error) {
      setError('Network error. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate('dashboard')}
          className="mb-4 inline-flex items-center text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Poll</h1>
        <p className="mt-2 text-gray-600">Create a poll and get real-time feedback from your audience.</p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Question */}
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Poll Question
              </label>
              <input
                type="text"
                id="question"
                value={formData.question}
                onChange={handleQuestionChange}
                placeholder="What would you like to ask?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.question.length}/500 characters
              </p>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Options
              </label>
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        maxLength={200}
                      />
                    </div>
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {formData.options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </button>
              )}

              <p className="mt-1 text-xs text-gray-500">
                You can have 2-10 options. Only filled options will be saved.
              </p>
            </div>

            {/* Publish Setting */}
            <div>
              <div className="flex items-center">
                <input
                  id="isPublished"
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-700">
                  Publish poll immediately
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Published polls are visible to all users and can receive votes immediately.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating Poll...' : 'Create Poll'}
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for creating effective polls:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Keep your question clear and specific</li>
          <li>• Provide comprehensive but concise options</li>
          <li>• Make sure options are mutually exclusive</li>
          <li>• Consider adding an "Other" option if applicable</li>
        </ul>
      </div>
    </div>
  );
}

export default CreatePoll;