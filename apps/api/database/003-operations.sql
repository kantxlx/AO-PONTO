ALTER TABLE orders ADD COLUMN request_hash TEXT;
ALTER TABLE system_settings ADD COLUMN automatic_calls BOOLEAN NOT NULL DEFAULT false;
INSERT INTO business_hours (weekday,is_closed,opens_at,closes_at)
SELECT day, false, '00:00'::time, '23:59:59'::time FROM generate_series(0,6) day
ON CONFLICT DO NOTHING;
