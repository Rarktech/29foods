-- Replaces the placeholder scaffold catalog with the real launch menu, matching
-- the approved customer-app design exactly (names, categories, prices, and the
-- Fanta 35cl sold-out state). Safe to run more than once (idempotent upsert by
-- name) and safe against any existing orders, since orders.items stores a
-- price/name snapshot rather than a live FK to menu_items.

alter table menu_items add constraint menu_items_name_key unique (name);

-- Drop scaffold-only items that aren't part of the real menu.
delete from menu_items
where name in ('Jollof Rice', 'Fried Rice', 'Fanta 50cl', 'Meat Pie');

with catalog as (
  insert into menu_items (name, category, price, is_available) values
    ('Party Jollof', 'rice', 290000, true),
    ('Grilled Chicken', 'protein', 180000, true),
    ('Native Jollof', 'rice', 260000, true),
    ('Ofada Special', 'rice', 320000, true),
    ('Garlic Fried Rice', 'rice', 270000, true),
    ('Peppered Chicken', 'protein', 210000, true),
    ('Fanta 35cl', 'drink', 30000, true)
  on conflict (name) do update
    set category = excluded.category,
        price = excluded.price,
        is_available = excluded.is_available,
        updated_at = now()
  returning id, name
)
insert into inventory (menu_item_id, stock_count, low_stock_threshold)
  select id, case when name = 'Fanta 35cl' then 0 else 50 end, 5
  from catalog
on conflict (menu_item_id) do update
  set stock_count = excluded.stock_count;
