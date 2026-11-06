function Hero({ user, onChoose = () => {} }) {
  return (
    <section className={`hero${user ? "" : " hero-guest"}`}>
      <div className="hero-shade" />
      {user ? (
        <>
          <div className="hero-content">
            <p className="hero-tag"><span /> THE ROAD STARTS HERE</p>
            <h1>Your next car<br /><em>is closer than ever.</em></h1>
            <p className="hero-description">
              A better way to find your next drive, with trusted vehicles and owners across Ghana.
            </p>
            <div className="hero-actions">
              <button className="button button-light" onClick={() => onChoose("sale")}>
                Explore cars for sale <span>↗</span>
              </button>
              <button className="hero-link" onClick={() => onChoose("rent")}>
                Find a rental <span>→</span>
              </button>
            </div>
            <div className="hero-footnote"><span className="hero-line" /> A smoother way to move</div>
          </div>
          <div className="hero-count"><strong>01</strong><span>DISCOVER YOUR DRIVE</span></div>
        </>
      ) : (
        <div className="hero-content guest-hero-content">
          <h1>A better way<br /><em>to move.</em></h1>
          <p className="hero-description">
            AutoHub is a marketplace to buy, sell, and rent cars across Ghana. Sign in or create an account to get started.
          </p>
        </div>
      )}
    </section>
  );
}

export default Hero;