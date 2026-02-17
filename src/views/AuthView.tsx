
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/localStore';
import { useTranslation } from '../store/LanguageContext';
import appLogo from '../assets/app2_logo.png';
import { UserRole } from '../types';
import { resetPassword } from '../services/auth';

const REMEMBER_KEY = 'majo_remember_email';

const AuthView: React.FC = () => {
  const { login, register } = useStore();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [aptNumberInput, setAptNumberInput] = useState('');
  const [phone, setPhone] = useState('');

  // Remember me
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    
    // Save or clear remembered email
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, trimmedEmail);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const result = await login(trimmedEmail, password);
    if (result === 'pending') {
      setError(t('errors.account_pending'));
    } else if (!result) {
      setError(t('errors.invalid_login'));
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);
    const result = await resetPassword(forgotEmail.trim().toLowerCase());
    setForgotLoading(false);
    if (result.success) {
      setForgotMsg({ type: 'success', text: t('auth.forgot_success') });
    } else {
      setForgotMsg({ type: 'error', text: t('auth.forgot_error') });
    }
  };

  const handlePhoneChange = (v: string) => {
    const digitsOnly = v.replace(/\D/g, '').substring(0, 8);
    setPhone(digitsOnly);
  };

  const handleAptChange = (v: string) => {
    const digitsOnly = v.replace(/\D/g, '').substring(0, 2);
    setAptNumberInput(digitsOnly);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError(t('errors.email_invalid'));
      return;
    }

    if (password.length < 8) {
      setError(t('errors.password_short'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwords_mismatch'));
      return;
    }

    const aptNum = parseInt(aptNumberInput);
    if (isNaN(aptNum) || aptNum < 1 || aptNum > 24) {
      setError(t('errors.apt_invalid'));
      return;
    }

    if (!phone) {
      setError(t('errors.phone_required'));
      return;
    }

    if (phone.length !== 8) {
      setError(t('errors.phone_invalid'));
      return;
    }

    if (!phone.startsWith('2')) {
      setError(t('errors.phone_start_2'));
      return;
    }

    const normalizedPhone = `+371${phone}`;

    const newUser = {
      id: Math.random().toString(36).substring(7),
      email: normalizedEmail,
      fullName,
      aptNumber: aptNum,
      role: UserRole.RESIDENT,
      createdAt: new Date().toISOString(),
      phoneNumber: normalizedPhone,
      status: 'pending' as const
    };

    await register(newUser, password);
    setSuccess(t('auth.registration_pending'));
    setMode('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setAptNumberInput('');
    setPhone('');
  };

  const isAptInvalid = aptNumberInput !== '' && (parseInt(aptNumberInput) < 1 || parseInt(aptNumberInput) > 24);

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-md mx-auto px-6 py-8 overflow-y-auto">
      <div className="flex flex-col items-center mb-8">
        <img src={appLogo} alt="Mājo" className="w-28 h-28 mb-3 object-contain bg-white rounded-2xl" />
        <h1 className="text-5xl font-light tracking-tight mb-1">
          <span className="text-gray-900">M</span><span style={{ color: '#5B9BD5' }}>ājo</span>
        </h1>
        <p className="text-gray-400 font-light text-sm">Ērta tava mājokļa pārvaldība.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium mb-4 flex items-start">
          <i className="fa-solid fa-circle-exclamation mr-3 mt-1"></i>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-xl text-sm font-medium mb-4 flex items-start">
          <i className="fa-solid fa-circle-check mr-3 mt-1"></i>
          <span>{success}</span>
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField icon="fa-envelope" type="email" placeholder={t('auth.email')} value={email} onChange={setEmail} />
          <InputField icon="fa-lock" type="password" placeholder={t('auth.password_login_placeholder')} value={password} onChange={setPassword} />
          
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400" />
              <span className="text-sm text-gray-600">{t('auth.remember_me')}</span>
            </label>
            <button type="button" onClick={() => { setShowForgotModal(true); setForgotEmail(email); setForgotMsg(null); }} className="text-sm font-medium" style={{ color: '#5B9BD5' }}>{t('auth.forgot_password')}</button>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform">{t('auth.submit_login')}</button>

          <div className="flex items-center my-2">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="px-4 text-xs font-bold text-gray-400 uppercase">{t('auth.or_divider')}</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <button type="button" className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-4 rounded-2xl flex items-center justify-center space-x-3 active:bg-gray-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            <span>{t('auth.google_login')}</span>
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.no_account')} <button type="button" onClick={() => { setMode('register'); setError(null); setSuccess(null); }} className="font-bold" style={{ color: '#5B9BD5' }}>{t('auth.register')}</button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <button type="button" onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="text-sm font-medium mb-2" style={{ color: '#5B9BD5' }}>
            <i className="fa-solid fa-arrow-left mr-1"></i> {t('auth.login')}
          </button>

          <InputField icon="fa-user" type="text" placeholder={t('auth.fullName')} value={fullName} onChange={setFullName} />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-phone"></i>
              </div>
              <div className="absolute inset-y-0 left-11 flex items-center pointer-events-none text-gray-400 text-sm">
                {t('auth.phone_prefix')}
              </div>
              <input 
                required
                type="tel"
                value={phone} 
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="block w-full pl-[4.8rem] pr-2 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                placeholder="2XXXXXXX"
                pattern="[0-9]*"
                inputMode="numeric"
              />
            </div>

            <div className="relative flex flex-col">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-door-open"></i>
                </div>
                <input 
                  required
                  type="text"
                  maxLength={2}
                  value={aptNumberInput} 
                  onChange={(e) => handleAptChange(e.target.value)}
                  className={`block w-full pl-11 pr-4 py-4 bg-gray-50 border rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm ${isAptInvalid ? 'border-red-500' : 'border-gray-100'}`}
                  placeholder={t('auth.aptNumber')}
                  inputMode="numeric"
                />
              </div>
              {isAptInvalid && (
                <p className="text-[10px] text-red-500 font-bold mt-1 px-1">{t('errors.apt_invalid')}</p>
              )}
            </div>
          </div>

          <InputField icon="fa-envelope" type="email" placeholder={t('auth.email')} value={email} onChange={setEmail} />
          <InputField icon="fa-lock" type="password" placeholder={t('auth.password_hint')} value={password} onChange={setPassword} />
          <InputField icon="fa-shield-halved" type="password" placeholder={t('auth.confirm_password')} value={confirmPassword} onChange={setConfirmPassword} />
          
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform">{t('auth.submit_register')}</button>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed px-2">{t('auth.register_note')}</p>
        </form>
      )}

      <div className="mt-auto text-center pt-8">
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForgotModal(false)}></div>
          <form onSubmit={handleForgotPassword} className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg">{t('auth.forgot_title')}</h3>
            <p className="text-sm text-gray-500">{t('auth.forgot_desc')}</p>
            {forgotMsg && (
              <div className={`p-3 rounded-xl text-sm font-medium ${forgotMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {forgotMsg.text}
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-envelope"></i>
              </div>
              <input
                required
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                placeholder="name@example.com"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => setShowForgotModal(false)} className="flex-1 py-3 text-gray-500 font-bold rounded-xl bg-gray-100 active:bg-gray-200">{t('common.cancel')}</button>
              <button type="submit" disabled={forgotLoading} className="flex-1 py-3 text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C6AE8, #9B8CFF)' }}>
                {forgotLoading ? '...' : t('auth.forgot_send')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const InputField: React.FC<{ icon: string, type: string, placeholder: string, value: string, onChange: (v: string) => void }> = ({ icon, type, placeholder, value, onChange }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <input 
      required
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
      placeholder={placeholder}
    />
  </div>
);

export default AuthView;
