import { useState, useEffect } from 'react';
import { apiClient } from '../../api/apiClient';

const Maintenance = () => {
  const [message, setMessage] = useState("Scheduled maintenance in progress. We'll be back shortly.");

  useEffect(() => {
    const fetchMaintenanceMessage = async () => {
      try {
        const res = await apiClient.get('/auth/settings');
        if (res.data && res.data.maintenanceMessage) {
          setMessage(res.data.maintenanceMessage);
        }
      } catch (err) {
        console.error('Error fetching maintenance status:', err);
      }
    };
    fetchMaintenanceMessage();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 text-amber-500 rounded-full shadow-inner animate-pulse">
          <span className="text-4xl">🛠</span>
        </div>
        
        <h1 className="font-display font-bold text-primary text-3xl">System Maintenance</h1>
        
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-sm text-gray-600 leading-relaxed font-medium">
          {message}
        </div>
        
        <p className="text-xs text-gray-400">
          Our team is currently upgrading the platform systems. We appreciate your patience and will restore access as soon as possible.
        </p>

        <div className="pt-2">
          <button 
            onClick={() => window.location.reload()} 
            className="btn-outline text-xs px-6 py-2 mx-auto"
          >
            ⟳ Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
