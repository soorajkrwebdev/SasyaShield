import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { getDistrictsForState, getStateNames, isValidStateDistrict } from '../data/indianStates';
import { Leaf, Lock, Mail, User, Phone, ArrowLeft } from 'lucide-react';
import { FarmingType } from '../types';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onBackToLanding: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onBackToLanding,
}) => {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [authMode, setAuthMode] = useState<'login' | 'register'>(
    initialMode === 'register' ? 'register' : 'login'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [farmingType, setFarmingType] = useState<FarmingType>('organic');

  const stateOptions = useMemo(() => getStateNames(), []);
  const districtOptions = useMemo(() => getDistrictsForState(state), [state]);

  const handleStateChange = (next: string) => {
    setState(next);
    setDistrict(''); // district must always belong to the selected state
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isRegister) {
      if (!fullName.trim() || !email.trim() || !password) {
        setError('Please enter your full name, email address, and password.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password should be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (!state) {
        setError('Please select your state / union territory.');
        setLoading(false);
        return;
      }
      if (!district) {
        setError('Please select your district.');
        setLoading(false);
        return;
      }
      if (!isValidStateDistrict(state, district)) {
        setError('The selected district does not belong to the selected state. Please choose again.');
        setLoading(false);
        return;
      }

      const res = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        state,
        district,
        farmingType,
      });

      if (res.error) {
        setError(res.error);
      } else {
        // Registration successful. Supabase has sent a confirmation email with
        // a link. Clicking the link authenticates the farmer and takes them
        // into the application automatically.
        setSuccess('Registration successful! We\'ve sent a confirmation link to your email. Please check your inbox and click the link to activate your account.');
        setAuthMode('login');
        setIsRegister(false);
        // Clear the form so the user can sign in
        setEmail('');
        setPassword('');
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please enter your email and password.');
        setLoading(false);
        return;
      }
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      {/* Back button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 mx-auto mb-3">
          <Leaf className="w-6 h-6 fill-white/20" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
          {isRegister ? 'Farmer Registration' : 'Farmer Sign In'}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          
          Sasyashield — Crop Protection Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100">
          {/* Tabs: Sign In / Register */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                  setAuthMode('login');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isRegister && authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Farmer Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                  setAuthMode('register');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isRegister && authMode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

          {error && (
            <div className="p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <Input
                      label="Full Name"
                      required
                      placeholder="e.g. Ramesh Patel"
                      leftIcon={<User className="w-4 h-4" />}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                    <Input
                      label="Mobile Number (Optional)"
                      placeholder="+91 98450 12345"
                      leftIcon={<Phone className="w-4 h-4" />}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="farmer@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                {isRegister && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="State / Union Territory"
                        required
                        value={state}
                        onChange={e => handleStateChange(e.target.value)}
                        options={[
                          { value: '', label: 'Select state/UT' },
                          ...stateOptions.map(s => ({ value: s, label: s })),
                        ]}
                      />
                      <Select
                        label="District"
                        required
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        disabled={!state}
                        helperText={!state ? 'Select a state first' : undefined}
                        options={[
                          { value: '', label: 'Select district' },
                          ...districtOptions.map(d => ({ value: d, label: d })),
                        ]}
                      />
                    </div>

                    <Select
                      label="Primary Farming Philosophy"
                      value={farmingType}
                      onChange={e => setFarmingType(e.target.value as FarmingType)}
                      options={[
                        { value: 'organic', label: '100% Organic Farming' },
                        { value: 'transitioning', label: 'Transitioning to Organic' },
                        { value: 'mixed', label: 'Mixed Farming System' },
                        { value: 'conventional', label: 'Conventional / Integrated' },
                      ]}
                    />
                  </>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full shadow-sm shadow-emerald-600/30"
                  >
                    {isRegister ? 'Register Farmer Account' : 'Sign In to Farm Platform'}
                  </Button>
                </div>
          </form>

          {/* Password reset hint */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Forgot your password?{' '}
              <button
                type="button"
                onClick={() => {
                  // handled by the AuthPage reset flow below if email is entered
                  setError('Enter your email above and use "Forgot Password" — this feature coming soon.');
                }}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                Reset Password
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
