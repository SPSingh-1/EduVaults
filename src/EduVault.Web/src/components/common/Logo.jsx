const EduFlowLogo = ({ size = 40, showText = true }) => (
  <div className="flex items-center gap-2.5">
    <img
      src="/logo.jpeg"
      alt="EduVault Logo"
      style={{ width: size, height: size }}
      className="object-contain flex-shrink-0"
    />
    {showText && (
      <div>
        <div
          className="font-display font-bold text-white leading-tight"
          style={{ fontSize: size * 0.38 }}
        >
          EduVault
        </div>
        {size > 30 && (
          <div
            className="text-blue-300 leading-tight"
            style={{ fontSize: size * 0.22 }}
          >
            School Management
          </div>
        )}
      </div>
    )}
  </div>
);

export default EduFlowLogo;
