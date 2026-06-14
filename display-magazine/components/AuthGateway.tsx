
import React, { useState } from 'react';
import { UserRole } from '../types';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface AuthGatewayProps {
  onSelectRole: (role: UserRole, data?: { name: string }) => void;
  onClose?: () => void;
}

type AuthAction = 'login' | 'signup' | 'register';

const AuthGateway: React.FC<AuthGatewayProps> = ({ onSelectRole, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [action, setAction] = useState<AuthAction | null>(null);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [udiseCode, setUdiseCode] = useState('');
  const [address, setAddress] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (step === 'otp') {
      setStep('details');
    } else if (action) {
      setAction(null);
    } else {
      setSelectedRole(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onSelectRole(UserRole.VIEWER, { name: user.displayName || 'User', id: user.uid });
    } catch (error: any) {
      // Ignore normal cancellation errors
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in cancelled or overlapping request handled.");
        return;
      }
      console.error("Auth error:", error);
      alert("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGoogleLogin();
  };

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onSelectRole(UserRole.ORGANIZATION, { 
        name: schoolName || 'Modern Academy',
        id: `org_${Date.now()}` // Mock ID for organization
      });
      setIsLoading(false);
    }, 1200);
  };

  const renderRoleSelection = () => (
    <div className="animate-fadeIn">
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-indigo-600 font-black text-2xl italic shadow-2xl mb-6">Ci</div>
        <h1 className="text-4xl md:text-5xl font-black font-montserrat tracking-tight leading-tight">Welcome to <span className="text-indigo-400">CreativeIndia</span></h1>
        <p className="text-slate-400 text-sm md:text-base font-medium">National platform for school creativity. Choose your path.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-slideUp">
        <button 
          onClick={() => handleGoogleLogin()}
          disabled={isLoading}
          className="group bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] text-left hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:rotate-6 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-2xl font-black mb-2">Student</h3>
          <p className="text-slate-400 text-xs leading-relaxed">Discover art, poems, and journals from schools across India.</p>
        </button>

        <button 
          onClick={() => setSelectedRole(UserRole.ORGANIZATION)}
          className="group bg-indigo-600 p-8 rounded-[40px] text-left hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-indigo-600/20"
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:-rotate-6 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-2xl font-black mb-2 text-white">School</h3>
          <p className="text-indigo-100/70 text-xs leading-relaxed">Admin portal to manage publications, student data, and analytics.</p>
        </button>
      </div>
    </div>
  );

  const renderActionSelection = () => (
    <div className="animate-scaleIn text-center max-w-sm mx-auto">
      <button onClick={handleBack} className="absolute top-0 left-0 flex items-center space-x-2 text-slate-500 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>
      
      <h2 className="text-3xl font-black mb-8 font-montserrat tracking-tight">
        {selectedRole === UserRole.ORGANIZATION ? 'School Portal' : 'Student Access'}
      </h2>
      
      <div className="space-y-4">
        <button 
          onClick={() => setAction('login')}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all"
        >
          Already have an account
        </button>
        <button 
          onClick={() => setAction(selectedRole === UserRole.ORGANIZATION ? 'register' : 'signup')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 p-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all"
        >
          {selectedRole === UserRole.ORGANIZATION ? 'Register New School' : 'Create Student Account'}
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="animate-scaleIn w-full">
      <button onClick={handleBack} className="absolute -top-12 left-0 flex items-center space-x-2 text-slate-500 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl max-h-[80vh] overflow-y-auto no-scrollbar">
        <h2 className="text-2xl font-black font-montserrat mb-8 flex items-center">
          <span className="bg-indigo-600 w-2 h-8 rounded-full mr-4"></span>
          {action === 'login' ? 'Welcome Back' : 'Join the Network'}
        </h2>

        {selectedRole === UserRole.VIEWER ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-slate-400 text-sm">Sign in with your Google account to access your creative dashboard, bookmarks, and regional highlights.</p>
              
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white text-slate-900 p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative bg-slate-950 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure Access</span>
            </div>
            
            <p className="text-[10px] text-center text-slate-500 font-medium leading-relaxed">
              By continuing, you agree to CreativeIndia's Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleOrgSubmit} className="space-y-5">
            {action === 'register' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Name</label>
                    <input required type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">UDISE+ Code</label>
                    <input required type="text" maxLength={11} value={udiseCode} onChange={(e) => setUdiseCode(e.target.value)} placeholder="11-digit code" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Email</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Address</label>
                  <input required type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Number</label>
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Set Password</label>
                    <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Email</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                    <span className="text-[9px] text-indigo-400 font-bold uppercase cursor-pointer">Forgot?</span>
                  </div>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}
            <button disabled={isLoading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>{action === 'register' ? 'Submit Registration' : 'Admin Login'}</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white animate-fadeIn">
      {onClose && !isLoading && (
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-[1010]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        {!selectedRole && renderRoleSelection()}
        {selectedRole && !action && renderActionSelection()}
        {selectedRole && action && renderForm()}
      </div>

      <p className="mt-12 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] opacity-50">Empowering Indian Education</p>
    </div>
  );
};

export default AuthGateway;
