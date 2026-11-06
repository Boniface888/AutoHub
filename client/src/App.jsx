import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SearchBar from "./components/SearchBar";
import CarCard from "./components/CarCard";
import CarGallery from "./components/CarGallery";
import { getListings } from "./services/listings";
import AuthModal from "./components/AuthModal";
import { apiBase } from "./services/listings";
import AdminDashboard from "./components/AdminDashboard";
import ListingForm from "./components/ListingForm";
import SellerSection from "./components/SellerSection";
import BookingModal from "./components/BookingModal";

const cars = [
  { id: 1, name: "Toyota Camry", year: 2022, location: "Accra", transmission: "Automatic", fuel: "Petrol", price: 185000, status: "sale", image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=900&q=85", mileage: "28,000 km", body: "Sedan" },
  { id: 2, name: "Mercedes-Benz C300", year: 2023, location: "Kumasi", transmission: "Automatic", fuel: "Petrol", price: 450000, status: "sale", image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=85", mileage: "12,500 km", body: "Sedan" },
  { id: 3, name: "Hyundai Tucson", year: 2021, location: "Accra", transmission: "Automatic", fuel: "Petrol", price: 2800, rate: "day", status: "rent", image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=85", mileage: "Unlimited", body: "SUV" },
  { id: 4, name: "Honda CR-V", year: 2022, location: "Tema", transmission: "Automatic", fuel: "Hybrid", price: 3200, rate: "day", status: "rent", image: "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=900&q=85", mileage: "Unlimited", body: "SUV" },
  { id: 5, name: "Toyota Corolla", year: 2020, location: "Accra", transmission: "Automatic", fuel: "Petrol", price: 142000, status: "sale", image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=900&q=85", mileage: "45,000 km", body: "Sedan" },
  { id: 6, name: "Kia Sportage", year: 2023, location: "Kumasi", transmission: "Automatic", fuel: "Diesel", price: 3600, rate: "day", status: "rent", image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=85", mileage: "Unlimited", body: "SUV" },
];

function App() {
  const [filters, setFilters] = useState({ type: "sale", search: "", location: "", maxPrice: "", sort: "recommended" });
  const [selectedCar, setSelectedCar] = useState(null);
  const [notice, setNotice] = useState("");
  const [apiListings, setApiListings] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingType, setListingType] = useState("sale");
  const [bookingCar, setBookingCar] = useState(null);
  const [listingRefresh, setListingRefresh] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getListings(filters, controller.signal)
        .then((listings) => { setApiListings(listings); setApiAvailable(true); })
        .catch(() => {
          if (!controller.signal.aborted) {
            setApiListings(null);
            setApiAvailable(false);
          }
        });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [user, filters, listingRefresh]);
  useEffect(() => {
    fetch(`${apiBase}/api/auth/me`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUser(data?.user || null))
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    if (apiListings !== null) return apiListings;
    const query = filters.search.trim().toLowerCase();
    const place = filters.location.trim().toLowerCase();
    return cars.filter((car) => car.status === filters.type
      && (!query || `${car.name} ${car.body} ${car.fuel}`.toLowerCase().includes(query))
      && (!place || car.location.toLowerCase().includes(place))
      && (!filters.maxPrice || car.price <= Number(filters.maxPrice)))
      .sort((a, b) => filters.sort === "price-low" ? a.price - b.price : filters.sort === "price-high" ? b.price - a.price : b.year - a.year);
  }, [filters, apiListings]);

  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <>
      <Navbar user={user} onChoose={(type) => { update({ type }); document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" }); }} onAction={(action) => action === "logout" ? fetch(`${apiBase}/api/auth/logout`, { method: "POST", credentials: "include" }).then(() => setUser(null)) : action === "admin" ? setAdminOpen(true) : action === "list-section" ? document.getElementById("list-your-car")?.scrollIntoView({ behavior: "smooth" }) : action === "sell" && user ? (setListingType("sale"), setListingOpen(true)) : setAuthMode(action === "sell" ? "signup" : action)} />
      <main>
        <Hero user={user} onChoose={(type) => { update({ type }); document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" }); }} />
        {user && (
          <>
            <SearchBar filters={filters} onChange={update} user={user} />
            <section className="cars-section" id="browse">
              <div className="section-header">
                <div><p className="eyebrow">CURATED FOR YOU</p><h2>{filters.type === "sale" ? "Cars for sale" : "Cars for rent"}</h2><p>Find the right car, from trusted listings across Ghana.</p></div>
                <label className="sort-control">Sort by <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
              </div>
              <div className="results-meta">{results.length} {results.length === 1 ? "vehicle" : "vehicles"} available {!apiAvailable && <span> · Demo listings</span>}</div>
              {results.length ? <div className="cars-grid">{results.map((car) => <CarCard key={car.id} car={car} onView={() => setSelectedCar(car)} />)}</div> : <div className="empty-state"><span>⌕</span><h3>No cars match those filters</h3><p>Try another location, keyword, or price range.</p><button className="button button-outline" onClick={() => update({ search: "", location: "", maxPrice: "" })}>Clear filters</button></div>}
            </section>
            <SellerSection onChoose={(type) => { setListingType(type); setListingOpen(true); }} />
            <section className="trust-strip"><div><strong>Local listings</strong><span>Cars across Ghana</span></div><div><strong>Clear details</strong><span>Know what you’re viewing</span></div><div><strong>Built around you</strong><span>Buy or rent with ease</span></div></section>
          </>
        )}
      </main>
      <footer className={`site-footer${user ? "" : " site-footer-guest"}`}><a className="brand" href="#top"><span className="brand-mark">A</span> AutoHub</a><span>{user ? "Find your next drive." : "Made for the way Ghana moves."}</span><span>© {new Date().getFullYear()} AutoHub Ghana</span></footer>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSuccess={(nextUser) => { setUser(nextUser); setAuthMode(null); }} />}
      {adminOpen && user?.role === "admin" && <AdminDashboard onClose={() => setAdminOpen(false)} />}
      {listingOpen && <ListingForm initialType={listingType} onClose={() => setListingOpen(false)} onSuccess={() => { setListingOpen(false); update({ type: listingType, search: "", location: "", maxPrice: "" }); setListingRefresh((tick) => tick + 1); setNotice("Your car listing is now live."); }} />}
      {selectedCar && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCar(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedCar(null)} aria-label="Close">×</button><CarGallery images={selectedCar.images || []} fallbackImage={selectedCar.image} alt={selectedCar.name} /><div className="modal-content"><p className="eyebrow">{selectedCar.status === "sale" ? "FOR SALE" : "AVAILABLE TO RENT"} · {selectedCar.location.toUpperCase()}</p><h2 id="detail-title">{selectedCar.name}</h2><div className="detail-specs"><span>{selectedCar.year}</span><span>{selectedCar.transmission}</span><span>{selectedCar.fuel}</span><span>{selectedCar.mileage}</span></div><strong className="modal-price">GH₵ {selectedCar.price.toLocaleString()}{selectedCar.rate ? <small> / day</small> : ""}</strong><p>{selectedCar.description || (user ? (selectedCar.status === "rent" ? "Choose your dates and send a rental request to the owner." : "Contact the listing owner to learn more and arrange a viewing.") : "Sign in or create an account to contact sellers and request rentals.")}</p><button className="button button-primary" onClick={() => { const car = selectedCar; setSelectedCar(null); if (!user) setAuthMode("login"); else if (car.status === "rent") { if (typeof car.id === "string") setBookingCar(car); else setNotice("Rental requests are available for active database listings."); } else setNotice("Contact details will be available once a seller profile is set up."); }}>{user ? (selectedCar.status === "rent" ? "Request rental" : "Contact seller") : "Sign in to continue"}</button></div></section></div>}
      {bookingCar && <BookingModal car={bookingCar} onClose={() => setBookingCar(null)} onSuccess={() => { setBookingCar(null); setNotice("Rental request sent to the owner."); }} />}
    </>
  );
}

export default App;
