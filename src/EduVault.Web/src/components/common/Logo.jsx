const EduFlowLogo = ({ size = 40, showText = true }) => {
  const savedUser = localStorage.getItem('eduvault_user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const logoSrc = user?.logoUrl || '/logo.jpeg';

  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoSrc}
        alt="EduVault Logo"
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0 border border-white/10"
      />
      {showText && (
        <div>
          <div
            className="font-display font-bold text-white leading-tight"
            style={{ fontSize: size * 0.38 }}
          >
            {user?.schoolName || 'EduVault'}
          </div>
          {size > 30 && (
            <div
              className="text-blue-300 leading-tight"
              style={{ fontSize: size * 0.22 }}
            >
              {user?.role === 'superadmin' ? 'SuperAdmin Global' : 'School Management'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EduFlowLogo;
