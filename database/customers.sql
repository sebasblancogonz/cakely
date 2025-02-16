CREATE TABLE customers (
    id SERIAL PRIMARY KEY, 
    name TEXT NOT NULL,            
    email TEXT UNIQUE NOT NULL,    
    phone TEXT,                    
    registration_date TIMESTAMP DEFAULT NOW(), 
    notes TEXT                     
);

-- Índices para búsquedas comunes
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone);