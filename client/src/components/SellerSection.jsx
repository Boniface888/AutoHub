function SellerSection({ onChoose }) {
  return (
    <section className="seller-section" id="list-your-car" aria-labelledby="seller-title">
      <div className="seller-heading">
        <p className="eyebrow">YOUR CAR, YOUR CHOICE</p>
        <h2 id="seller-title">Have a car to share?</h2>
        <p>Reach people across Ghana. List your car for sale or make it available to rent.</p>
      </div>
      <div className="seller-options">
        <article className="seller-option seller-option-sale">
          <div className="seller-option-top"><span>01 / SELL</span><span aria-hidden="true">↗</span></div>
          <h3>Find its next owner.</h3>
          <p>Share your car’s details with people looking to buy.</p>
          <button className="button button-primary" onClick={() => onChoose("sale")}>List a car for sale <span aria-hidden="true">→</span></button>
        </article>
        <article className="seller-option seller-option-rent">
          <div className="seller-option-top"><span>02 / RENT</span><span aria-hidden="true">↗</span></div>
          <h3>Earn from your car.</h3>
          <p>Offer your car to people who need a rental in your area.</p>
          <button className="button button-outline" onClick={() => onChoose("rent")}>List a car for rent <span aria-hidden="true">→</span></button>
        </article>
      </div>
      <p className="seller-review-note"><span aria-hidden="true">✓</span> Your car appears in the matching sale or rental listings after you submit.</p>
    </section>
  );
}

export default SellerSection;
