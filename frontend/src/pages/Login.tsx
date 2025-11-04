// Login.tsx
import { useContext, useState } from 'react';
import { AxiosError } from 'axios';
import AuthForm from '../components/AuthForm';
import { AuthContext } from '../contexts/AuthContextDefinition';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext)!;
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleLogin = async (email?: string, password?: string) => {
    setError('');
    try {
      await login(email ?? '', password ?? '');
      navigate('/dashboard');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: string }>;
      setError(axiosError.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div>
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
        </div>
      )}
      <AuthForm onSubmit={handleLogin} isSignup={false} />
    </div>
  );
};

export default Login;

