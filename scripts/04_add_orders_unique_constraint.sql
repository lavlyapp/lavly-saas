-- Adds a unique constraint to the orders table so that upserts work correctly.
-- Without this, the VMPay Sync silently fails to save machine cycle details (cestos).
ALTER TABLE orders
ADD CONSTRAINT unique_sale_machine_data UNIQUE (sale_id, machine, data);
