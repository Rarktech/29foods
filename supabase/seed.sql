-- Local dev seed data. Never run against production.

insert into qr_codes (qr_code, lodge_name, zone) values
  ('peace-lodge', 'Peace Lodge', 'presco_core'),
  ('g-hostel', 'G Hostel', 'g_hostel')
on conflict (qr_code) do nothing;

with new_items as (
  insert into menu_items (name, category, price, is_available) values
    ('Jollof Rice', 'rice', 150000, true),
    ('Fried Rice', 'rice', 150000, true),
    ('Grilled Chicken', 'protein', 200000, true),
    ('Fanta 50cl', 'drink', 30000, true),
    ('Meat Pie', 'snack', 80000, true)
  returning id, name
)
insert into inventory (menu_item_id, stock_count, low_stock_threshold)
  select id, 50, 5 from new_items
on conflict (menu_item_id) do nothing;
