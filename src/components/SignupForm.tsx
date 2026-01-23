
import React, { useState } from 'react';
import { User, UserRole, Batch, BATCHES } from '../types';
import { db } from '../services/db';
import { ArrowLeft, User as UserIcon, Mail, Lock, Loader2, Hash, Users, BookOpen } from 'lucide-react';

interface SignupFormProps {
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onBack }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', rollNumber: '', classGrade: '', batch: 'A' as Batch
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const newUser: User = {
      id: `student-${Date.now()}`,
      ...formData,
      role: UserRole.STUDENT,
      faceDataRegistered: false
    };

    const { user, error: signupError } = await db.signup(newUser);
    setLoading(false);

    if (user) {
        onSuccess(user);
    } else {
        setError(signupError || 'Registration failed.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <button onClick={onBack} className="flex items-center text-slate-400 mb-6 hover:text-slate-600 transition-colors"><ArrowLeft className="w-4 h-4 mr-1"/> Back</button>
        <h2 className="text-3xl font-bold mb-2 text-slate-900">Student Registration</h2>
        <p className="text-slate-500 mb-6">Create your profile to start tracking attendance.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700">Full Name</label>
            <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <input 
                    name="name" 
                    required 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="John Doe"
                    onChange={handleChange}
                    value={formData.name}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Roll Number</label>
            <div className="relative">
                <Hash className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <input 
                    name="rollNumber" 
                    required 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="CS-101"
                    onChange={handleChange}
                    value={formData.rollNumber}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Class / Grade</label>
            <div className="relative">
                <BookOpen className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <input 
                    name="classGrade" 
                    required 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Year 12"
                    onChange={handleChange}
                    value={formData.classGrade}
                />
            </div>
          </div>

           <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700">Assigned Batch</label>
            <div className="relative">
                <Users className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <select 
                    name="batch" 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    onChange={handleChange}
                    value={formData.batch}
                >
                    {BATCHES.map(b => <option key={b} value={b}>Batch {b}</option>)}
                </select>
            </div>
            <p className="text-xs text-slate-500 mt-1">Your weekly schedule depends on your batch.</p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700">Email Address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <input 
                    name="email" 
                    type="email" 
                    required 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="student@school.com"
                    onChange={handleChange}
                    value={formData.email}
                />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-slate-700">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                <input 
                    name="password" 
                    type="password" 
                    required 
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Create a password"
                    onChange={handleChange}
                    value={formData.password}
                />
            </div>
          </div>

          <div className="col-span-2 pt-2">
            <button 
                disabled={loading} 
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
                {loading ? <Loader2 className="animate-spin"/> : 'Create Account & Register Face'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
