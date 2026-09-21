-- Local dev seed data. Never run against production.

insert into qr_codes (qr_code, lodge_name, zone) values
  ('peace-lodge', 'Peace Lodge', 'presco_core'),
  ('g-hostel', 'G Hostel', 'g_hostel')
on conflict (qr_code) do nothing;

with new_items as (
  insert into menu_items (name, category, price, is_available) values
    ('Party Jollof', 'rice', 290000, true),
    ('Grilled Chicken', 'protein', 180000, true),
    ('Native Jollof', 'rice', 260000, true),
    ('Ofada Special', 'rice', 320000, true),
    ('Garlic Fried Rice', 'rice', 270000, true),
    ('Peppered Chicken', 'protein', 210000, true),
    ('Fanta 35cl', 'drink', 30000, true)
  on conflict (name) do nothing
  returning id, name
)
insert into inventory (menu_item_id, stock_count, low_stock_threshold)
  select id, case when name = 'Fanta 35cl' then 0 else 50 end, 5 from new_items
on conflict (menu_item_id) do nothing;
