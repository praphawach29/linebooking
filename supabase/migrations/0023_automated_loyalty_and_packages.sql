-- 0023_automated_loyalty_and_packages.sql

-- 1. tenant_loyalty_settings
CREATE TABLE IF NOT EXISTS tenant_loyalty_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    point_strategy TEXT NOT NULL DEFAULT 'DISABLED', -- 'PER_VISIT', 'AMOUNT_BASED', 'DISABLED'
    points_per_visit INTEGER DEFAULT 0,
    points_per_currency INTEGER DEFAULT 0,
    currency_amount INTEGER DEFAULT 100, -- e.g., 1 point per 100 THB
    enable_package_deduction BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tenant_loyalty_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_loyalty_settings_updated_at
BEFORE UPDATE ON tenant_loyalty_settings
FOR EACH ROW
EXECUTE FUNCTION update_tenant_loyalty_settings_updated_at();


-- 2. customer_packages
CREATE TABLE IF NOT EXISTS customer_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Optional, if linked to specific service
    package_name TEXT NOT NULL,
    total_quota INTEGER NOT NULL,
    used_quota INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'DEPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_customer_packages_updated_at
BEFORE UPDATE ON customer_packages
FOR EACH ROW
EXECUTE FUNCTION update_tenant_loyalty_settings_updated_at();

-- RLS Policies
ALTER TABLE tenant_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;

-- tenant_loyalty_settings RLS
-- Anyone can read tenant loyalty settings
CREATE POLICY "Public can view tenant loyalty settings"
    ON tenant_loyalty_settings FOR SELECT
    USING (true);

-- Only tenant owners can update their own settings
CREATE POLICY "Tenant owners can update loyalty settings"
    ON tenant_loyalty_settings FOR ALL
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_user_id = auth.uid()
        )
    );

-- customer_packages RLS
-- Customers can view their own packages
CREATE POLICY "Users can view their own packages"
    ON customer_packages FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Tenant owners can view all packages in their tenant
CREATE POLICY "Tenant owners can view their packages"
    ON customer_packages FOR SELECT
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_user_id = auth.uid()
        )
    );

-- Tenant owners can insert/update packages in their tenant
CREATE POLICY "Tenant owners can manage packages"
    ON customer_packages FOR ALL
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_user_id = auth.uid()
        )
    );
