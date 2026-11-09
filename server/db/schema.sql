CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version TEXT,
  terms_accepted_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year SMALLINT NOT NULL CHECK (year BETWEEN 1980 AND 2100),
  location TEXT NOT NULL,
  transmission TEXT NOT NULL CHECK (transmission IN ('Automatic','Manual')),
  fuel TEXT NOT NULL CHECK (fuel IN ('Petrol','Diesel','Hybrid','Electric')),
  body TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price > 0),
  type TEXT NOT NULL CHECK (type IN ('sale','rent')),
  image_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','removed','paused','sold','rented')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_browse_idx ON listings (status,type,location,price,created_at DESC);
CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings (owner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  renter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','cancelled','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS bookings_availability_idx ON bookings (listing_id,starts_at,ends_at) WHERE status IN ('requested','confirmed');

ALTER TABLE listings ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;


CREATE TABLE IF NOT EXISTS listing_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_phone TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  owner_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_inquiries_owner_idx ON listing_inquiries (listing_id,created_at DESC);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS renter_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_viewed_at TIMESTAMPTZ;
ALTER TABLE listing_inquiries ADD COLUMN IF NOT EXISTS owner_viewed_at TIMESTAMPTZ;
UPDATE listings AS listing SET contact_email = users.email FROM users WHERE listing.owner_id = users.id AND listing.contact_email IS NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_listing_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK (status IN ('pending','active','rejected','removed','paused','sold','rented'));


CREATE TABLE IF NOT EXISTS listing_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listing_moderation_events_listing_idx ON listing_moderation_events (listing_id, created_at DESC);

CREATE TABLE IF NOT EXISTS site_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT UNIQUE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_notification BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS site_activity_events_created_idx ON site_activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS site_activity_events_notifications_idx ON site_activity_events (created_at DESC) WHERE is_notification;

CREATE TABLE IF NOT EXISTS admin_activity_reads (
  event_id UUID NOT NULL REFERENCES site_activity_events(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, admin_id)
);

ALTER TABLE site_activity_events ADD COLUMN IF NOT EXISTS source_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS site_activity_events_source_key_idx ON site_activity_events (source_key) WHERE source_key IS NOT NULL;

INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:account:'||u.id::text,'account.created',u.id,NULL,'An account was created.','{}'::jsonb,u.created_at FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:listing:'||l.id::text,'listing.created',l.owner_id,l.id,
  CASE WHEN l.type='sale' THEN 'A sale vehicle was listed: ' ELSE 'A rental vehicle was listed: ' END||l.title,
  jsonb_build_object('title',l.title,'type',l.type),l.created_at FROM listings l
ON CONFLICT DO NOTHING;
INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:completion:'||l.id::text,CASE WHEN l.status='sold' THEN 'vehicle.sold' ELSE 'vehicle.rented' END,l.owner_id,l.id,
  CASE WHEN l.status='sold' THEN 'A vehicle was marked sold: ' ELSE 'A vehicle was marked rented: ' END||l.title,
  jsonb_build_object('title',l.title,'type',l.type),l.updated_at FROM listings l WHERE l.status IN ('sold','rented')
ON CONFLICT DO NOTHING;
INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:inquiry:'||i.id::text,'sale.inquiry',i.buyer_id,i.listing_id,'A buyer sent an inquiry for '||l.title||'.',jsonb_build_object('title',l.title,'type','sale'),i.created_at
FROM listing_inquiries i JOIN listings l ON l.id=i.listing_id ON CONFLICT DO NOTHING;
INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:booking:'||b.id::text,'rental.requested',b.renter_id,b.listing_id,'A rental was requested for '||l.title||'.',jsonb_build_object('title',l.title,'type','rent'),b.created_at
FROM bookings b JOIN listings l ON l.id=b.listing_id ON CONFLICT DO NOTHING;
INSERT INTO site_activity_events (source_key,event_type,actor_id,listing_id,summary,details,created_at)
SELECT 'backfill:moderation:'||m.id::text,'listing.moderated',m.admin_id,m.listing_id,
  'An administrator changed a vehicle listing to '||m.new_status||'.',jsonb_build_object('status',m.new_status,'reason',m.reason),m.created_at
FROM listing_moderation_events m ON CONFLICT DO NOTHING;
