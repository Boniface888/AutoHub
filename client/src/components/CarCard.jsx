function CarCard({ car, onView = () => {} }) {
  const isRental = car.status === "rent";
  return <article className="car-card"><button className="car-image" onClick={onView} aria-label={`View ${car.name} details`}><img src={car.image} alt={car.name} loading="lazy" /><span className={`listing-badge ${isRental ? "badge-rent" : ""}`}>{isRental ? "FOR RENT" : "FOR SALE"}</span><span className="image-arrow" aria-hidden="true">↗</span>{car.images?.length > 1 && <span className="car-photo-count">▣ {car.images.length} photos</span>}</button><div className="car-info"><p className="car-location"><span>⌖</span> {car.location}, Ghana <span className="card-year">{car.year}</span></p><h3>{car.name}</h3><div className="car-details"><span>{car.body}</span><i /> <span>{car.transmission}</span><i /> <span>{car.fuel}</span></div><div className="car-bottom"><strong>GH₵ {car.price.toLocaleString()}<small>{isRental ? " / day" : ""}</small></strong><button className="view-button" onClick={onView}>View details <span>→</span></button></div></div></article>;
}

export default CarCard;
