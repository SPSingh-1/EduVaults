const EduFlowLogo = ({ size = 40, showText = true, alwaysShowDefaultText = false }) => {
  const savedUser = localStorage.getItem('eduvault_user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const logoSrc = (alwaysShowDefaultText || !user?.logoUrl) ? '/logo.jpeg' : user.logoUrl;

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
            {(alwaysShowDefaultText || !user?.schoolName) ? 'EduVault' : user.schoolName}
          </div>
          {size > 30 && (
            <div
              className="text-blue-300 leading-tight"
              style={{ fontSize: size * 0.22 }}
            >
              {(alwaysShowDefaultText || user?.role !== 'superadmin') ? 'School Management' : 'SuperAdmin Global'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EduFlowLogo;
