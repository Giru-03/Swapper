import { useState } from 'react';

interface AuthFormProps {
  onSubmit: (name?: string, email?: string, password?: string) => void | Promise<void>;
  isSignup: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSubmit, isSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        // signup expects (name, email, password)
        await onSubmit(name, email, password);
      } else {
        // login expects (email, password)
        // call with email first so the login handler receives the right values
        // (previously we passed name as the first arg which caused email to be empty)
        await onSubmit(email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 to-indigo-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">SlotSwapper</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {isSignup ? 'Create Account' : 'Sign In'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                required={isSignup}
                autoComplete="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
        
        <p className="mt-6 text-center text-gray-600">
          {isSignup ? 'Already have an account? ' : 'Don\'t have an account? '}
          <a href={isSignup ? '/login' : '/signup'} className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer">
            {isSignup ? 'Sign In' : 'Sign Up'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;