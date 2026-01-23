import React from 'react';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                FR
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">
                FaceRec<span className="text-primary-600">Attend</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                  {user.role === UserRole.ADMIN ? (
                    <Shield className="w-4 h-4 text-purple-600" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="font-medium">{user.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};