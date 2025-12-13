
import pool from './db.js';
import bcrypt from 'bcrypt';

const schema = `
-- Employees/Users table
CREATE TABLE IF NOT EXISTS employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_code VARCHAR(50) UNIQUE,
    role VARCHAR(50) DEFAULT 'technician',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Location logs table
CREATE TABLE IF NOT EXISTS location_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT,
    altitude FLOAT,
    speed FLOAT,
    heading FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    battery_level INTEGER,
    network_status VARCHAR(20),
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_location_employee_id ON location_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_location_timestamp ON location_logs(timestamp DESC);

-- Tracking sessions table
CREATE TABLE IF NOT EXISTS tracking_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_duration INTERVAL,
    total_distance FLOAT DEFAULT 0,
    total_locations INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const seed = async () => {
    try {
        console.log('Initializing Database...');
        await pool.query(schema);
        console.log('Tables created.');

        // Check if admin user exists
        const check = await pool.query("SELECT * FROM employees WHERE email = 'admin@loctrack.com'");
        if (check.rows.length === 0) {
            console.log('Creating default admin user...');
            const hash = await bcrypt.hash('password123', 10);
            await pool.query(
                `INSERT INTO employees (email, password_hash, first_name, last_name, role)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['admin@loctrack.com', hash, 'Admin', 'User', 'admin']
            );
            console.log('Default user created: admin@loctrack.com / password123');
        } else {
            console.log('Default user already exists.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Failed to init DB', e);
        process.exit(1);
    }
};

seed();
