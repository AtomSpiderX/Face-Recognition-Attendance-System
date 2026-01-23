import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';
import { ArrowLeft, Key, Mail, Loader2 } from 'lucide-react';

interface LoginFormProps {
  role: UserRole;
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ role, onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await db.login(email, password);
      if (user) {
        if (user.role !== role) {
           setError(`Please use the ${user.role.toLowerCase()} portal.`);
        } else {
           onSuccess(user);
        }
      } else {
        setError('Invalid credentials.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <button onClick={onBack} className="flex items-center text-slate-400 mb-6 hover:text-slate-600"><ArrowLeft className="w-4 h-4 mr-1"/> Back</button>
        <h2 className="text-3xl font-bold mb-2 text-slate-900">{role === UserRole.ADMIN ? 'Admin' : 'Student'} Login</h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input type="email" required className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Password</label>
            <div className="relative">
                <Key className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input type="password" required className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center hover:bg-blue-700 transition-colors">
            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
        
        {role === UserRole.ADMIN && (
            <div className="mt-4 text-xs text-center text-slate-400">
                Default Admin: admin@school.com / admin
            </div>
        )}
      </div>
    </div>
  );
};
