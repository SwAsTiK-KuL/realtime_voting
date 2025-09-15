import { User, LogOut, Plus, Home, BarChart3 } from 'lucide-react';

function Navbar({ user, token, onLogout, onNavigate, currentPage }) {
  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">RealTime Polls</span>
            </div>
          </div>

          {/* Navigation Links */}
          {token && (
            <div className="flex items-center space-x-6">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onNavigate('create')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === 'create' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Create Poll</span>
              </button>
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {token ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name || 'Loading...'}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onNavigate('login')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === 'login'
                      ? 'bg-indigo-600 text-white'
                      : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === 'register'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;