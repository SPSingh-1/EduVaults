import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL Query parameter extraction (e.g. /forgot-password?token=XYZ&email=abc)
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [step, setStep] = useState(initialToken ? 2 : 1); // 1 = Request Code, 2 = Verify Code & Reset
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialToken) {
      setStep(2);
    }
  }, [initialToken]);

  // Step 1: Request Password Reset Token
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      if (response.data.success) {
        setInfoMessage(response.data.message || 'If an account exists, a reset code has been dispatched.');
        setStep(2);
      } else {
        setError(response.data.error || 'Failed to dispatch reset request.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Token and Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || token.trim().length < 8) {
      setError('Please enter the valid password reset token or code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email: email.trim(),
        token: token.trim(),
        newPassword
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired password reset token.');
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
          <h2 className="font-display font-bold text-primary text-2xl mb-2">Password Reset Complete</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your account password has been securely updated. You may now sign in using your new credentials.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
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
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-xl">
            <img src="/logo.jpeg" alt="EduVault Logo" className="w-12 h-12 rounded-full" />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">EduVault</h1>
          <p className="text-gray-500 text-sm">Secure Institutional ERP Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-primary text-xl">
              {step === 1 ? 'Forgot Password' : 'Enter Reset Code'}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              Step {step} of 2
            </span>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            {step === 1 
              ? 'Enter your registered email address to receive a secure recovery code.' 
              : 'Enter the recovery code sent to your email and your new password.'}
          </p>

          {infoMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg p-3 mb-4">
              ℹ {infoMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">
              ⚠️ {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@institution.edu" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="input" 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {loading ? <span className="animate-spin">⟳</span> : null}
                {loading ? 'Sending Instructions...' : 'Send Recovery Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Already have a reset code? Click here ›
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@institution.edu" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="input" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recovery Token / Code</label>
                <input 
                  type="text" 
                  placeholder="Enter 64-character token or code" 
                  value={token} 
                  onChange={e => setToken(e.target.value)} 
                  className="input font-mono text-xs" 
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
                className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {loading ? <span className="animate-spin">⟳</span> : null}
                {loading ? 'Securing Account...' : 'Set New Password'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  ‹ Request a different recovery code
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center border-t border-gray-100 pt-4">
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm text-primary hover:underline font-semibold"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2026 EduVault Systems Inc. · Privacy & Security Policy</p>
      </div>
    </div>
  );
};

export default ForgotPassword;
