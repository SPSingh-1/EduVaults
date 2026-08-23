import { useAuth } from '../../contexts/AuthContext';
import Topbar from '../../components/layout/Topbar';
import { User, Mail, Building, ShieldCheck, BookOpen } from 'lucide-react';

const LibraryProfile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="My Library Profile" subtitle="Librarian Account Details" />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              {(user?.firstName?.[0] || 'L')}{(user?.lastName?.[0] || 'B')}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{user?.firstName} {user?.lastName}</h2>
              <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider mt-0.5">School Librarian</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Institution</span>
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-600" />
                {user?.schoolName || 'School'}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Assigned Role</span>
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Library Catalog & Issue Operations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryProfile;
