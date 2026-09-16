function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        AutoHub
      </div>

      <div className="nav-links">
        <a href="#">Buy Cars</a>
        <a href="#">Rent Cars</a>
        <a href="#">Sell/Rent Your Car</a>
      </div>

      <div className="nav-actions">
        <button>Login</button>
        <button>Sign Up</button>
      </div>
    </nav>
  );
}

export default Navbar;