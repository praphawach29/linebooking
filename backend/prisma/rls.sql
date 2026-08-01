-- Enable RLS on tenant-isolated tables
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staffs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cancellation_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current tenant id from session setting
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant', true), '')::UUID;
END;
$$ LANGUAGE plpgsql;

-- 1. Services
CREATE POLICY tenant_isolation_services ON "services"
FOR ALL USING (tenant_id = current_tenant_id());

-- 2. Staffs
CREATE POLICY tenant_isolation_staffs ON "staffs"
FOR ALL USING (tenant_id = current_tenant_id());

-- 3. Staff Services
CREATE POLICY tenant_isolation_staff_services ON "staff_services"
FOR ALL USING (tenant_id = current_tenant_id());

-- 4. Business Hours
CREATE POLICY tenant_isolation_business_hours ON "business_hours"
FOR ALL USING (tenant_id = current_tenant_id());

-- 5. Staff Schedules
CREATE POLICY tenant_isolation_staff_schedules ON "staff_schedules"
FOR ALL USING (tenant_id = current_tenant_id());

-- 6. Bookings
CREATE POLICY tenant_isolation_bookings ON "bookings"
FOR ALL USING (tenant_id = current_tenant_id());

-- 7. Payments
CREATE POLICY tenant_isolation_payments ON "payments"
FOR ALL USING (tenant_id = current_tenant_id());

-- 8. Notifications
CREATE POLICY tenant_isolation_notifications ON "notifications"
FOR ALL USING (tenant_id = current_tenant_id());

-- 9. Cancellation Policies
CREATE POLICY tenant_isolation_cancellation_policies ON "cancellation_policies"
FOR ALL USING (tenant_id = current_tenant_id());

-- 10. User Roles
CREATE POLICY tenant_isolation_user_roles ON "user_roles"
FOR ALL USING (tenant_id = current_tenant_id());

-- Note: Tenants and Users tables are shared and shouldn't generally be RLS restricted this way, 
-- or they need custom policies.
