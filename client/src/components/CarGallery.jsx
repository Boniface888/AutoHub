import { useState } from "react";

const viewLabels = { front: "Front view", rear: "Rear view", interior: "Interior", other: "Other view" };

function CarGallery({ images = [], fallbackImage, alt }) {
  const gallery = images.length ? images : [{ url: fallbackImage, view: "front" }];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] || gallery[0];
  const move = (direction) => setActiveIndex((index) => (index + direction + gallery.length) % gallery.length);

  return (
    <div className="car-gallery">
      <div className="gallery-main">
        <img src={activeImage.url} alt={`${alt} — ${viewLabels[activeImage.view] || "vehicle photo"}`} />
        {gallery.length > 1 && <>
          <button className="gallery-arrow gallery-previous" onClick={() => move(-1)} aria-label="Previous car photo">‹</button>
          <button className="gallery-arrow gallery-next" onClick={() => move(1)} aria-label="Next car photo">›</button>
          <span className="gallery-count">{activeIndex + 1} / {gallery.length} · {viewLabels[activeImage.view] || "Other view"}</span>
        </>}
      </div>
      {gallery.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Car photos">
          {gallery.map((image, index) => (
            <button className={index === activeIndex ? "is-active" : ""} key={`${image.url}-${index}`} onClick={() => setActiveIndex(index)} aria-label={`Show ${viewLabels[image.view] || "other view"}, photo ${index + 1}`} aria-pressed={index === activeIndex}>
              <img src={image.url} alt="" />
              <span>{viewLabels[image.view] || "Other view"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CarGallery;
