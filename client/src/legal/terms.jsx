import { CURRENT_TERMS_VERSION } from "./termsVersion";

const termsSections = [
  { title: "1. Who operates AutoHub", paragraphs: [
    "AutoHub is an online marketplace where people can discover vehicles offered for sale or rent by other users. The marketplace operator is separate from each seller and rental provider. Operator identity and contact details are shown below and should be completed before public launch.",
    "AutoHub does not own, inspect, certify, sell, rent, insure, finance, deliver, or transfer title to vehicles listed by users. Unless a separate written agreement says otherwise, the vehicle transaction is between the listing owner and the buyer or renter."
  ]},
  { title: "2. Who may use the service", paragraphs: [
    "You must be at least 18 years old, have legal capacity to enter an agreement, provide a working email address, and keep your account credentials secure. This is an AutoHub account rule. Do not create an account for another person or impersonate anyone.",
    "You are responsible for activity through your account. Tell AutoHub promptly if you believe someone has accessed it without permission."
  ]},
  { title: "3. Rules for every user", paragraphs: [
    "Use AutoHub lawfully and honestly. Keep account and contact information accurate. Do not use the marketplace to scam, threaten, harass, discriminate unlawfully, send spam, interfere with the service, access another account, or collect another person’s information for an unrelated purpose.",
    "Do not upload false, misleading, stolen, unlawful, unsafe, or unavailable vehicle listings, forged documents, altered number plates or vehicle identifiers, manipulated mileage, or photos that do not fairly show the vehicle. Do not post content that infringes another person’s copyright, privacy, or other rights.",
    "Do not ask another user to pay a fee to AutoHub. AutoHub currently does not collect vehicle purchase prices, rental charges, deposits, or booking payments."
  ]},
  { title: "4. Rules for vehicle sellers", paragraphs: [
    "Only list a vehicle if you own it or have clear authority from its owner to advertise and sell it. You must be able to support your authority and respond to reasonable requests for evidence.",
    "Give a truthful, current description. Disclose known material damage, faults, prior significant repairs, mileage concerns, title or registration issues, finance interests or other restrictions, and any fact a reasonable buyer would need to decide whether to proceed. Use recent photos of the actual vehicle and do not hide important defects. Where the law requires it, make your full legal name and status, address, telephone, email, and business registration details available to the buyer.",
    "Show the asking price and any additional amount the buyer may have to pay, including taxes, fees, delivery, or other charges where applicable. Keep the listing available only while the vehicle is available. Remove or update it promptly when the vehicle is no longer for sale.",
    "State the full price and any delivery or handover time, plus any warranty, return, exchange, or refund terms that apply. Keep a record of the agreement and transaction. You are responsible for arranging viewings, test drives, payment, receipts, and completion of the sale. Verify payment independently. Complete ownership transfer and vehicle documentation through the Driver and Vehicle Licensing Authority (DVLA) and any other applicable process. An AutoHub listing is not proof of ownership or a transfer of title."
  ]},
  { title: "5. Rules for rental providers", paragraphs: [
    "Only offer a vehicle for rent if you own it or have authority to rent it out. Before accepting a rental, make sure the vehicle is roadworthy and that registration, insurance, permitted use, and any applicable licence or operator requirements cover the proposed rental.",
    "State the rental price and charging period, deposit and other charges, availability, collection and return arrangements, mileage or use limits, and any important restrictions before the renter commits. Where the law requires it, make your full legal name and status, address, telephone, email, and business registration details available to the renter. Keep the listing and calendar accurate.",
    "Set out the rental agreement directly with the renter, including the handover condition, permitted drivers, required licence, insurance arrangements, fuel, late return, breakdown, accident, damage, cancellation, and deposit terms. Do not describe a term as guaranteed by AutoHub. Keep a handover record and provide the renter with a copy of the agreement."
  ]},
  { title: "6. Rules for buyers", paragraphs: [
    "Review the listing carefully and contact the seller to confirm that the vehicle, price, documents, and availability are current. Arrange a physical inspection and, where appropriate, an independent mechanical inspection and a safe test drive before paying.",
    "Verify the seller’s authority, the vehicle identity and documents, and any finance or title restrictions. Agree in writing on the final price, included items, delivery, and any warranty or return promise. Use a traceable payment method and obtain a receipt. Do not rely on screenshots of payment as proof that funds have cleared.",
    "Follow the DVLA process for ownership transfer. AutoHub does not verify vehicle title, guarantee a seller, hold funds, or act as an escrow or payment service."
  ]},
  { title: "7. Rules for renters", paragraphs: [
    "Before requesting or collecting a rental vehicle, confirm the total price, deposit, insurance coverage, permitted drivers, mileage and use limits, collection and return arrangements, and cancellation terms in a written rental agreement with the provider.",
    "Provide a valid driving licence and other information reasonably required by the provider or insurer. Do not let an unauthorised person drive, use the vehicle unlawfully, take it outside an agreed area, or use it in a way prohibited by the agreement or insurance.",
    "Inspect the vehicle at handover, record existing damage, and report an accident, theft, breakdown, or new damage promptly to the provider and the relevant authorities or insurer. Return the vehicle at the agreed time and condition, subject to fair wear and tear and the written agreement."
  ]},
  { title: "8. Contact details and direct transactions", paragraphs: [
    "When you contact a listing owner or submit a purchase inquiry or rental request, AutoHub may share the contact details and message you submit with that owner so the parties can respond to one another. Do not include passwords, payment card details, identity documents, or unrelated sensitive information in a listing or message.",
    "The parties must agree directly on the transaction and keep a record of their communications, contract, payment, handover, and any complaint. AutoHub does not process the transaction or resolve disputes as a party to the sale or rental."
  ]},
  { title: "9. Vehicle listing and user content", paragraphs: [
    "You keep ownership of content you submit. You give AutoHub permission to host, display, resize, and share that content as needed to operate, secure, and promote the relevant listing on the service. This permission ends when the content is removed, except for copies retained in backups or records where reasonably needed for security, legal compliance, or dispute handling.",
    "You confirm that you have permission to submit each photo, description, and other material. Do not include faces, identity documents, home addresses, or other people’s personal information in listing photos unless you have a lawful reason and permission."
  ]},
  { title: "10. Personal information and privacy", paragraphs: [
    "AutoHub uses account details, listing information, messages, and request details to provide the marketplace, protect accounts, prevent fraud, handle support and disputes, and meet legal obligations. Listing owner contact details are shown or shared only as needed for a vehicle inquiry or rental request.",
    "AutoHub uses reasonable technical and organisational safeguards for personal information and limits access to people who need it for the service. No online service can promise absolute security. We may retain information for as long as needed for these purposes, backups, and legal obligations, then delete or de-identify it where appropriate.",
    "You may ask to access or correct personal information, or raise a privacy concern, using the operator contact details below. Applicable rights and exceptions under Ghana’s Data Protection Act, 2012 (Act 843) continue to apply. A separate privacy notice should be published before launch with complete processing, retention, service-provider, and complaint details."
  ]},
  { title: "11. Reports, moderation, and platform penalties", paragraphs: [
    "AutoHub may review listings and account activity, ask for supporting information, and restrict or remove content that appears to breach these Terms, mislead users, create a safety risk, infringe rights, or violate law. An administrator may immediately hide or remove a pending or live vehicle listing and record the reason. AutoHub may also warn a user, limit features, suspend an account, or close an account for serious or repeated breaches.",
    "Where practical, AutoHub will tell the affected user the reason and provide a way to contact support or request a review. A review request does not automatically restore a listing. AutoHub may preserve relevant records and disclose them when required by law or to an appropriate authority for a credible safety, fraud, or unlawful-activity concern.",
    "AutoHub’s platform measures are not fines or criminal punishments. Only a court or authorised public body can impose penalties under applicable law. This clause does not create a private fine, waive a legal right, or promise a particular legal outcome."
  ]},
  { title: "12. Safety and suspected fraud", paragraphs: [
    "Meet in a safe public place where possible. Independently verify the vehicle and documents, do not share account security codes, and do not send money before you have checked the person, vehicle, agreement, and payment instructions. Stop communication and report suspicious conduct through the operator contact details below.",
    "Contact the police or emergency services directly if there is an immediate safety threat or suspected crime. AutoHub cannot guarantee that a user, vehicle, document, or payment is genuine."
  ]},
  { title: "13. Service availability and responsibility", paragraphs: [
    "AutoHub may change, suspend, or discontinue parts of the service for maintenance, security, or operational reasons. Listings and user information are supplied by users; AutoHub does not guarantee their accuracy, vehicle condition, user identity, availability, or fitness for a particular purpose.",
    "Nothing in these Terms excludes or limits a consumer right, duty, or liability that cannot lawfully be excluded or limited. To the extent the law permits, AutoHub is not responsible for a private sale, rental, payment, vehicle defect, injury, loss, or dispute between users. Users remain responsible for their own statements, listings, agreements, and conduct."
  ]},
  { title: "14. Complaints and governing law", paragraphs: [
    "Contact AutoHub using the details below for a listing report, account issue, privacy request, or complaint. We will review the information supplied and respond through the available contact channel. Parties to a vehicle sale or rental should first use the process in their own written agreement and may also contact the relevant regulator, DVLA, insurer, police, or court.",
    "These marketplace Terms are governed by the laws of Ghana, subject to any mandatory rights and procedures that apply to you. Disputes that cannot be resolved directly may be brought before a court with jurisdiction."
  ]},
  { title: "15. Changes and contact", paragraphs: [
    "AutoHub may update these Terms to reflect changes in the service or law. We will show the updated version and require you to read and accept it before continuing to use marketplace features. The version and acceptance time are recorded with your account.",
    "For support, complaints, listing reports, or privacy requests, contact the AutoHub operator using the details shown below."
  ]}
];

export function TermsDocument({ operator = {} }) {
  const fields = [
    ["Legal name", operator.name],
    ["Legal status", operator.status],
    ["Address", operator.address],
    ["Telephone", operator.phone],
    ["Email", operator.email],
    ["Website", operator.website]
  ];
  const configured = fields.some(([, value]) => Boolean(value));

  return (
    <div className="terms-document">
      <div className="terms-heading">
        <p className="eyebrow">AUTOHUB GHANA · VERSION 1</p>
        <h2>Terms and Conditions</h2>
        <p>Effective 9 November 2026 · Version {CURRENT_TERMS_VERSION}</p>
      </div>
      <section className="terms-operator">
        <h3>Marketplace operator details</h3>
        {configured ? (
          <dl>{fields.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        ) : (
          <p className="terms-configuration-note">Operator identity and contact details are being configured and must be completed before public launch.</p>
        )}
      </section>
      {termsSections.map((section) => (
        <section className="terms-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
    </div>
  );
}
