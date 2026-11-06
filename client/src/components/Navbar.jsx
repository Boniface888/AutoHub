import { useState } from "react";

function Navbar({ user, onChoose = () => {}, onAction = () => {} }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleChoose = (type) => {
    onChoose(type);
    setIsMenuOpen(false);
  };

  const handleAction = (action) => {
    onAction(action);
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar" id="top">
      <a className="brand" href="#top" aria-label="AutoHub home">
        <span className="brand-mark">A</span>
        <span>AutoHub</span>
      </a>

      {user && (
        <nav
          className={`nav-links${isMenuOpen ? " is-open" : ""}`}
          id="primary-navigation"
          aria-label="Main navigation"
        >
          <a href="#browse" onClick={() => handleChoose("sale")}>Buy</a>
          <a href="#browse" onClick={() => handleChoose("rent")}>Rent</a>
          <a href="#list-your-car" onClick={() => handleAction("list-section")}>Sell your car</a>
        </nav>
      )}

      <div className="nav-actions">
        {user ? (
          <>
            {user.role === "admin" && (
              <button className="login-button" onClick={() => handleAction("admin")}>Admin</button>
            )}
            <span className="account-email">{user.email}</span>
            <button className="login-button" onClick={() => handleAction("logout")}>Log out</button>
            <button
              className="menu-toggle"
              type="button"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-controls="primary-navigation"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{isMenuOpen ? "×" : "☰"}</span>
            </button>
          </>
        ) : (
          <>
            <button className="login-button" onClick={() => handleAction("login")}>Log in</button>
            <button className="button button-primary nav-signup" onClick={() => handleAction("signup")}>Sign up</button>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
