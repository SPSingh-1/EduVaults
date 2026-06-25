import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email,
        newPassword
      });
      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Failed to update password');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6 text-3xl">
            ✓
          </div>
          <h2 className="font-display font-bold text-primary text-2xl mb-2">Password Reset Successful</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your password has been successfully updated. You can now log in using your new credentials.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-xl">
            <span className="text-3xl"><img src="/logo.jpeg" alt="EduVault Logo" className="w-12 h-12 rounded-full" /></span>
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">EduVault</h1>
          <p className="text-gray-500 text-sm">Manage your institution with ease</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <h2 className="font-display font-bold text-primary text-xl mb-1">Reset Password</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your email address and choose a new password</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <input 
                type="email" 
                placeholder="name@school.edu" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="input" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
              <div className="relative">
                <input 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="input pr-10" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
              <input 
                type={showPass ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="input" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-spin">⟳</span> : null}
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm text-primary hover:underline font-semibold"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2026 EduFlow Systems Inc. · Privacy Policy · Terms</p>
      </div>
    </div>
  );
};

export default ForgotPassword;
