import React from 'react';
import { UserRole } from '../types';
import { Shield, User, GraduationCap, Lock, ArrowRight, ScanFace } from 'lucide-react';

interface LandingProps {
  onLogin: (role: UserRole) => void;
  onSignup: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Left Section - Hero */}
      <div className="w-full md:w-1/2 bg-slate-900 text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0 0 L100 100 L0 100 Z" fill="white" />
           </svg>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Live Face Detection System
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Next Generation <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Attendance Tracking
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Eliminate proxy attendance with our advanced computer vision algorithms. 
            Secure, fast, and automated monitoring for modern educational institutions.
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-blue-400" />
              <span>Liveness Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>Spoof Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <span>Encrypted Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="w-full md:w-1/2 bg-white p-8 md:p-16 flex flex-col justify-center items-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-600 mt-2">Select your portal to continue</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => onLogin(UserRole.STUDENT)}
              className="w-full group relative flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">Student Portal</h3>
                  <p className="text-sm text-slate-500">Mark attendance & view history</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => onLogin(UserRole.ADMIN)}
              className="w-full group relative flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">Admin Portal</h3>
                  <p className="text-sm text-slate-500">Manage students & reports</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">New Student?</span>
            </div>
          </div>

          <button
            onClick={onSignup}
            className="w-full py-4 px-6 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            Register New Account
          </button>
        </div>
      </div>
    </div>
  );
};