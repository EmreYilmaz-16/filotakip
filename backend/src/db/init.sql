-- ============================================================
-- FILO TAKIP SISTEMI - Veritabani Semasi
-- ============================================================

-- Kullanicilar (Yonetici, Yonetici, Surucu)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'manager', 'driver')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arac Tipleri (lookup)
CREATE TABLE IF NOT EXISTS vehicle_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Araclar
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    plate_no VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30),
    vin_no VARCHAR(17) UNIQUE,
    engine_no VARCHAR(50),
    vehicle_type_id INTEGER REFERENCES vehicle_types(id) ON DELETE SET NULL,
    fuel_type VARCHAR(20) DEFAULT 'diesel' CHECK (fuel_type IN ('benzin', 'dizel', 'lpg', 'elektrik', 'hibrit')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'faulty', 'retired', 'sold')),
    current_km INTEGER DEFAULT 0,
    purchase_date DATE,
    purchase_price NUMERIC(12,2),
    image_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suruculer
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tc_no VARCHAR(11) UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    birth_date DATE,
    license_no VARCHAR(30) UNIQUE,
    license_class VARCHAR(10),
    license_expiry DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    photo_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zimmetler (Arac - Surucu atamasi)
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_date DATE,
    km_at_assignment INTEGER,
    km_at_return INTEGER,
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'returned')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arac Belgeleri (sigorta, muayene, ruhsat, vb.)
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('insurance', 'inspection', 'registration', 'license', 'emission', 'other')),
    document_name VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    insurance_company VARCHAR(100),
    policy_no VARCHAR(50),
    amount NUMERIC(12,2),
    file_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yakit Kayitlari
CREATE TABLE IF NOT EXISTS fuel_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    km_at_fuel INTEGER NOT NULL,
    liters NUMERIC(8,2) NOT NULL,
    unit_price NUMERIC(8,3) NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    fuel_type VARCHAR(20) DEFAULT 'dizel' CHECK (fuel_type IN ('benzin', 'dizel', 'lpg', 'elektrik')),
    station_name VARCHAR(100),
    receipt_no VARCHAR(50),
    is_full_tank BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KM Kayitlari (sayac okuma)
CREATE TABLE IF NOT EXISTS km_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    km_value INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bakim Tipleri (lookup)
CREATE TABLE IF NOT EXISTS maintenance_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_interval_km INTEGER,
    default_interval_days INTEGER
);

-- Periyodik Bakim Planlari
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type_id INTEGER REFERENCES maintenance_types(id) ON DELETE SET NULL,
    custom_name VARCHAR(100),
    interval_km INTEGER,
    interval_days INTEGER,
    last_done_km INTEGER,
    last_done_date DATE,
    next_due_km INTEGER,
    next_due_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bakim Kayitlari
CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type_id INTEGER REFERENCES maintenance_types(id) ON DELETE SET NULL,
    schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    km_at_maintenance INTEGER NOT NULL,
    description TEXT,
    service_name VARCHAR(100),
    invoice_no VARCHAR(50),
    labor_cost NUMERIC(10,2) DEFAULT 0,
    parts_cost NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) DEFAULT 0,
    next_maintenance_km INTEGER,
    next_maintenance_date DATE,
    file_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ariza Raporlari
CREATE TABLE IF NOT EXISTS fault_reports (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_date TIMESTAMPTZ DEFAULT NOW(),
    fault_type VARCHAR(50) CHECK (fault_type IN ('mekanik', 'elektrik', 'kaporta', 'lastik', 'cam', 'diger')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    resolved_date TIMESTAMPTZ,
    resolution_notes TEXT,
    repair_cost NUMERIC(10,2),
    downtime_hours NUMERIC(6,2),
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ariza Yorum / Aktivite Kaydi
CREATE TABLE IF NOT EXISTS fault_activities (
    id SERIAL PRIMARY KEY,
    fault_id INTEGER NOT NULL REFERENCES fault_reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('comment', 'status_change', 'assignment')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    departure_km INTEGER,
    departure_time TIME,
    return_km INTEGER,
    return_time TIME,
    purpose VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'completed')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trip_logs_vehicle ON trip_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_driver ON trip_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_date ON trip_logs(date);

-- Surucu Belgeleri
CREATE TABLE IF NOT EXISTS driver_documents (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('src','psikoteknik','saglik_raporu','takograf_karti','ehliyet','diger')),
    src_type VARCHAR(10),
    document_no VARCHAR(50),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(100),
    file_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_expiry ON driver_documents(expiry_date);

-- Arac Vergileri (MTV)
CREATE TABLE IF NOT EXISTS vehicle_taxes (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'mtv' CHECK (tax_type IN ('mtv','diger')),
    year INTEGER NOT NULL,
    installment SMALLINT CHECK (installment IN (1,2)),
    amount NUMERIC(12,2),
    due_date DATE,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_taxes_vehicle ON vehicle_taxes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_taxes_year ON vehicle_taxes(year);

-- ============================================================
-- VARSAYILAN VERILER
-- ============================================================

INSERT INTO vehicle_types (name, description) VALUES
    ('Binek Otomobil', 'Normal yolcu tasimaciligi amaçli'),
    ('Hafif Ticari', 'Kucuk kargo ve is araclari'),
    ('Kamyonet', 'Orta olcekli yuklu araclar'),
    ('Kamyon', 'Agir yuklu araclar'),
    ('Otobüs / Minibüs', 'Toplu tasima araclari'),
    ('Is Makinesi', 'Forklift, vinc ve benzeri is makineleri'),
    ('Motosiklet', 'Motosiklet ve scooter'),
    ('Diger', 'Diger arac tipleri')
ON CONFLICT DO NOTHING;

INSERT INTO maintenance_types (name, description, default_interval_km, default_interval_days) VALUES
    ('Yag Degisimi', 'Motor yagi ve filtre degisimi', 10000, 365),
    ('Lastik Rotasyon', 'Lastik rotasyonu ve balansi', 10000, NULL),
    ('Hava Filtresi', 'Hava filtresi degisimi', 20000, NULL),
    ('Yakit Filtresi', 'Yakit filtresi degisimi', 30000, 730),
    ('Fren Kontrolu', 'Fren balatasi ve disk kontrolu', 20000, NULL),
    ('Akü Kontrolu', 'Aku test ve degisim', NULL, 365),
    ('Klima Bakimi', 'Klima gazi dolum ve servisi', NULL, 365),
    ('Distribütor / Kayis', 'Distribütor veya zamanlama kayisi', 60000, NULL),
    ('Genel Servis', 'Kapsamli genel servis bakimi', 10000, 365),
    ('Muayene Hazirlik', 'Araç muayenesi oncesi genel kontrol', NULL, 365)
ON CONFLICT DO NOTHING;

-- Varsayilan admin kullanici (sifre: Admin123!)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
    ('admin', 'admin@filotakip.local', '$2a$10$35uHUXaSq/3FavIxqF/KqOscM6w2yG8SKjiH010.yPf5yZ9OJye5e', 'Sistem Yoneticisi', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEKSLER
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_no);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver ON assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(date);
CREATE INDEX IF NOT EXISTS idx_km_vehicle ON km_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_km_date ON km_records(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(date);
CREATE INDEX IF NOT EXISTS idx_fault_vehicle ON fault_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fault_status ON fault_reports(status);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON vehicle_documents(expiry_date);
