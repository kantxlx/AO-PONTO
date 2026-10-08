CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  email TEXT NOT NULL CHECK (length(btrim(email)) > 0),
  password_hash TEXT NOT NULL CHECK (length(password_hash) >= 60),
  role TEXT NOT NULL CHECK (role IN ('MANAGER', 'EMPLOYEE')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(btrim(email)));

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  idempotency_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'IN_PREPARATION', 'COMPLETED')),
  in_person BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL)),
  CHECK (completed_at IS NULL OR completed_at >= created_at)
);
CREATE INDEX orders_pending_idx ON orders (created_at) WHERE status <> 'COMPLETED';

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  cut_id TEXT NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
  cut_name TEXT NOT NULL CHECK (length(btrim(cut_name)) > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'un')),
  quantity NUMERIC(9,3) NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  subtotal_cents BIGINT GENERATED ALWAYS AS (round(quantity * unit_price_cents)::BIGINT) STORED,
  UNIQUE (order_id, cut_id, unit),
  CHECK (unit <> 'un' OR quantity = trunc(quantity))
);
CREATE INDEX order_items_cut_idx ON order_items (cut_id);

CREATE TABLE service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  sequential_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CALLED', 'FINISHED', 'EXPIRED')),
  call_count INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  reissue_count INTEGER NOT NULL DEFAULT 0 CHECK (reissue_count >= 0 AND reissue_count <= call_count),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_call_at TIMESTAMPTZ,
  CHECK (last_call_at IS NULL OR last_call_at >= generated_at)
);
CREATE INDEX service_tickets_pending_idx ON service_tickets (sequential_number) WHERE status = 'PENDING';

CREATE TABLE call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE RESTRICT,
  called_by UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('MANUAL', 'AUTOMATIC', 'REISSUE')),
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX call_history_ticket_idx ON call_history (ticket_id, called_at);

CREATE TABLE system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo' CHECK (timezone = 'America/Sao_Paulo'),
  ticket_display_seconds INTEGER NOT NULL DEFAULT 15 CHECK (ticket_display_seconds BETWEEN 1 AND 3600),
  max_reissues INTEGER NOT NULL DEFAULT 3 CHECK (max_reissues BETWEEN 0 AND 100),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO system_settings (id) VALUES (1);

CREATE TABLE business_hours (
  weekday SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_closed BOOLEAN NOT NULL DEFAULT false,
  opens_at TIME,
  closes_at TIME,
  CHECK ((is_closed AND opens_at IS NULL AND closes_at IS NULL) OR
         (NOT is_closed AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);
