function SearchBar() {
  return (
    <section className="search-section">
      <div className="search-container">

        <div className="search-tabs">
          <button className="active-tab">Buy Cars</button>
          <button>Rent Cars</button>
        </div>

        <div className="search-form">

          <div className="search-field">
            <label>What are you looking for?</label>
            <input
              type="text"
              placeholder="Make, model or keyword"
            />
          </div>

          <div className="search-field">
            <label>Location</label>
            <input
              type="text"
              placeholder="Accra, Kumasi..."
            />
          </div>

          <button className="search-button">
            Search Cars
          </button>

        </div>

      </div>
    </section>
  );
}

export default SearchBar;