function Hero({ user, onChoose = () => {} }) {
  return (
    <section className="hero">
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="hero-tag"><span /> THE ROAD STARTS HERE</p>
        <h1>Your next car<br /><em>is closer than ever.</em></h1>
        <p className="hero-description">
          A better way to find your next drive, with trusted vehicles and owners across Ghana.
        </p>
        {user ? (
          <div className="hero-actions">
            <button className="button button-light" onClick={() => onChoose("sale")}>
              Explore cars for sale <span>↗</span>
            </button>
            <button className="hero-link" onClick={() => onChoose("rent")}>
              Find a rental <span>→</span>
            </button>
          </div>
        ) : (
          <div className="guest-marketplace-note">
            <span className="guest-note-icon" aria-hidden="true">✦</span>
            <div className="guest-note-copy">
              <span className="guest-note-label">ONE MARKETPLACE, THREE WAYS TO MOVE</span>
              <strong>Buy, sell, and rent cars across Ghana.</strong>
              <span>Sign in or create an account to get started.</span>
            </div>
          </div>
        )}
        <div className="hero-footnote"><span className="hero-line" /> A smoother way to move</div>
      </div>
      <div className="hero-count"><strong>01</strong><span>DISCOVER YOUR DRIVE</span></div>
    </section>
  );
}

export default Hero;
