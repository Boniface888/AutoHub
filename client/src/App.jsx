import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SearchBar from "./components/SearchBar";
import CarCard from "./components/CarCard";

const cars = [
  {
    id: 1,
    name: "Toyota Camry",
    year: 2022,
    location: "Accra",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 185000,
    status: "For Sale",
    image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb"
  },
  {
    id: 2,
    name: "Mercedes-Benz C300",
    year: 2023,
    location: "Kumasi",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 450000,
    status: "For Sale",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8"
  },
  {
    id: 3,
    name: "Hyundai Tucson",
    year: 2021,
    location: "Accra",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 280000,
    status: "For Rent",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6"
  }
];

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <SearchBar />

      <section className="cars-section">
        <div className="section-header">
          <h2>Featured Cars</h2>
          <p>Explore vehicles available on AutoHub.</p>
        </div>

        <div className="cars-grid">
          {cars.map((car) => (
  <CarCard
    key={car.id}
    name={car.name}
    year={car.year}
    location={car.location}
    transmission={car.transmission}
    fuel={car.fuel}
    price={car.price}
    status={car.status}
    image={car.image}
  />
))}
        </div>
      </section>
    </>
  );
}

export default App;