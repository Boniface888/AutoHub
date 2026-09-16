function CarCard({
  name,
  year,
  location,
  transmission,
  fuel,
  price,
  status,
  image
}) {
  return (
    <article className="car-card">

    <div className="car-image">
        <img src={image} alt={name} />
        <span>{status}</span>
       </div>
    <div className="car-info">

        <h3>{name}</h3>

        <p className="car-location">
          {location}
        </p>

        <div className="car-details">
          <span>{year}</span>
          <span>{transmission}</span>
          <span>{fuel}</span>
        </div>

        <div className="car-bottom">
          <strong>GH₵ {price.toLocaleString()}</strong>

          <button>View Details</button>
        </div>

      </div>

    </article>
  );
}

export default CarCard;