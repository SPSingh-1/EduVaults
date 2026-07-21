import { useEffect, useState } from 'react';

const Loader = ({ fullPage = true, message }) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const messages = [
    "Unlocking the vault of knowledge",
    "Polishing your desk",
    "Organizing class rosters",
    "Loading student reports",
    "Preparing the classroom"
  ];
  
  const [randomMessage] = useState(() => {
    return messages[Math.floor(Math.random() * messages.length)];
  });

  const displayMessage = message || randomMessage;

  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      {/* Styles */}
      <style>{`
        @keyframes float-cap {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes swing-tassel {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes spin-ring {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-float-cap {
          animation: float-cap 2s ease-in-out infinite;
        }
        .animate-swing-tassel {
          animation: swing-tassel 2s ease-in-out infinite;
          transform-origin: 32px 18px;
        }
        .animate-spin-ring {
          animation: spin-ring 1.2s linear infinite;
        }
        .animate-pulse-text {
          animation: pulse-text 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Graduation Cap & Spinner Visual */}
      <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
        {/* Spinning Outer Orbit Ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/10 border-t-primary border-r-primary/40 animate-spin-ring"></div>
        
        {/* Floating Graduation Cap (Mortarboard) */}
        <div className="animate-float-cap flex items-center justify-center">
          <svg
            className="w-13 h-13 text-primary drop-shadow-[0_4px_8px_rgba(var(--color-primary),0.25)]"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* The Cap Board */}
            <path
              d="M32 8L58 18L32 28L6 18L32 8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cap Skull Underneath */}
            <path
              d="M17 22.5V32C17 40 23.7 44 32 44C40.3 44 47 40 47 32V22.5"
              fill="currentColor"
              fillOpacity="0.15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Cap Base Ring */}
            <path
              d="M17 26C17 26 23 29 32 29C41 29 47 26 47 26"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Hanging Tassel Button */}
            <circle cx="32" cy="18" r="1.5" fill="currentColor" />
            {/* Hanging Tassel */}
            <path
              d="M32 18C28 20 28 29 28 34"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-swing-tassel"
            />
            {/* Tassel Fringe Badge */}
            <path
              d="M26 34H30V38L28 41L26 38V34Z"
              fill="#f59e0b"
              className="animate-swing-tassel"
            />
          </svg>
        </div>
      </div>

      {/* Loading Label */}
      <h3 className="font-display font-bold text-slate-800 text-sm tracking-wide mb-1 select-none">
        EduVault
      </h3>
      <p className="text-xs text-slate-400 font-medium select-none h-4 flex items-center justify-center animate-pulse-text">
        {displayMessage}{dots}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-slate-50/70 backdrop-blur-md z-[9999] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-3xs">
      {content}
    </div>
  );
};

export default Loader;
