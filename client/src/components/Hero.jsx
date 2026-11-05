function Hero({ onChoose = () => {} }) {
  return <section className="hero"><div className="hero-shade" /><div className="hero-content"><p className="hero-tag"><span /> THE ROAD STARTS HERE</p><h1>Your next car<br /><em>is closer than ever.</em></h1><p className="hero-description">A better way to find your next drive. Browse trusted cars to buy or rent across Ghana.</p><div className="hero-actions"><button className="button button-light" onClick={() => onChoose("sale")}>Explore cars for sale <span>↗</span></button><button className="hero-link" onClick={() => onChoose("rent")}>Find a rental <span>→</span></button></div><div className="hero-footnote"><span className="hero-line" /> A smoother way to move</div></div><div className="hero-count"><strong>01</strong><span>DISCOVER YOUR DRIVE</span></div></section>;
}

export default Hero;
