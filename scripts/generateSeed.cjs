const fs = require('fs');

const generateSeedSql = () => {
    // Generate valid UUIDs for a few core entities
    const TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const SERVICE_ID = '11111111-1111-1111-1111-111111111111';
    const STAFF_ID = '22222222-2222-2222-2222-222222222222';
    
    let sql = `-- Seed data for Line OA Booking SaaS\n\n`;
    
    sql += `INSERT INTO tenants (id, name, slug, description, business_type, plan, is_active, settings)\n`;
    sql += `VALUES ('${TENANT_ID}', 'ร้านสปาตัวอย่าง', 'spa-demo', 'ร้านสปาตัวอย่างสำหรับทดสอบระบบ', 'spa', 'pro', true, '{"currency": "THB", "autoConfirm": true, "depositPercentage": 50}'::jsonb);\n\n`;

    sql += `INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active)\n`;
    sql += `VALUES ('${SERVICE_ID}', '${TENANT_ID}', 'นวดแผนไทย', 'นวดแผนไทย 60 นาที', 60, 500, 1, 'นวด', true);\n\n`;

    sql += `INSERT INTO staff (id, tenant_id, name, phone, bio, is_active)\n`;
    sql += `VALUES ('${STAFF_ID}', '${TENANT_ID}', 'หมอนวด 1', '080-000-0000', 'หมอนวดมืออาชีพ', true);\n\n`;

    sql += `INSERT INTO business_hours (id, tenant_id, day_of_week, open_time, close_time, is_open)\n`;
    for(let i=0; i<7; i++) {
        sql += `VALUES (uuid_generate_v4(), '${TENANT_ID}', ${i}, '09:00', '20:00', true);\n`;
    }
    
    fs.writeFileSync('supabase/seed.sql', sql);
    console.log('Seed SQL generated at supabase/seed.sql');
};

generateSeedSql();
