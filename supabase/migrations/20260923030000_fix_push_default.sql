-- notification_prefs.push defaulted to true for every account, meaning "device is
-- subscribed to push" was indistinguishable from "hasn't opted out" — the settings
-- toggle showed ON before any device ever actually subscribed, so tapping it called
-- disablePush() (a silent no-op) instead of ever prompting for permission. Fix the
-- default for new accounts, and backfill existing ones that have no real subscription.

alter table users alter column notification_prefs set default '{
  "riderMsg": true, "delivered": true,
  "flash": true, "menuDrop": true,
  "planRenew": true, "planTomorrow": false,
  "cartNudge": true, "winback": false,
  "points": true, "referral": true,
  "push": false, "sms": false,
  "quiet": true, "quietFrom": "22:00", "quietTo": "07:00"
}'::jsonb;

update users
set notification_prefs = jsonb_set(notification_prefs, '{push}', 'false'::jsonb)
where (notification_prefs->>'push')::boolean is distinct from false
  and not exists (select 1 from push_subscriptions where push_subscriptions.user_id = users.id);
