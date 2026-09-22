-- Admin dashboard Phase 1: small, additive extensions to already-existing
-- tables only (no new subsystems — those are deferred). Backs: Menu tab's
-- swallow category, Messages' meal-plan-subscriber targeting, and Feedback's
-- real resolution workflow (including Order Detail's "Log a complaint" action).

alter table menu_items drop constraint menu_items_category_check;
alter table menu_items add constraint menu_items_category_check
  check (category in ('rice', 'protein', 'drink', 'snack', 'swallow'));

alter table broadcasts drop constraint broadcasts_target_check;
alter table broadcasts add constraint broadcasts_target_check
  check (target in ('all', 'lodge', 'zone', 'inactive_users', 'meal_plan_subscribers'));

alter table feedback add column reason text;
alter table feedback add column status text not null default 'new'
  check (status in ('new', 'under_review', 'resolved'));
alter table feedback add column resolution text;
alter table feedback add column resolved_at timestamptz;
alter table feedback add column resolved_by uuid references admin_profiles(id);

-- Admin-authored complaints (e.g. logged from Order Detail without waiting on
-- customer-submitted feedback) have no order-delivered prerequisite, unlike the
-- customer-facing insert policy below — so they go through the service-role
-- client in a server action, same as every other admin write.
create policy "feedback admin all" on feedback for all using (is_admin()) with check (is_admin());
