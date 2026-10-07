CREATE TABLE IF NOT EXISTS cuts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  units TEXT[] NOT NULL CHECK (cardinality(units) > 0 AND units <@ ARRAY['kg', 'un']::TEXT[]),
  available BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true
);
