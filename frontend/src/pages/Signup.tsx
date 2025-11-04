// Signup.tsx
import { useContext, useState } from 'react';
import { AxiosError } from 'axios';
import AuthForm from '../components/AuthForm';
import { AuthContext } from '../contexts/AuthContextDefinition';
import { useNavigate } from 'react-router-dom';

const Signup: React.FC = () => {
  const { signup } = useContext(AuthContext)!;
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSignup = async (name?: string, email?: string, password?: string) => {
    setError('');
    try {
      await signup(name ?? '', email ?? '', password ?? '');
      navigate('/dashboard');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: string }>;
      setError(axiosError.response?.data?.error || 'Signup failed. Please try again.');
    }
  };

  return (
    <div>
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
        </div>
      )}
      <AuthForm onSubmit={handleSignup} isSignup={true} />
    </div>
  );
};

export default Signup;
