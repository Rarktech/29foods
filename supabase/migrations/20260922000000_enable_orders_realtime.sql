-- OrderStatusTracker subscribes to postgres_changes on `orders`, but tables
-- aren't part of Supabase's realtime publication by default — without this,
-- the webhook correctly marks an order paid in the database, but the customer's
-- browser never hears about it and "Waiting for payment confirmation…" never
-- resolves. RLS still applies: a client only receives change events for rows
-- its own policies (orders select own) allow it to see.
alter publication supabase_realtime add table orders;
