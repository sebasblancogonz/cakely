CREATE TYPE order_status AS ENUM ('Pendiente', 'En preparación', 'Listo', 'Entregado');
CREATE TYPE payment_method AS ENUM ('Tarjeta', 'Efectivo', 'Bizum', 'Transferencia bancaria');
CREATE TYPE product_type AS ENUM ('Tarta', 'Galletas', 'Cupcakes', 'Macarons', 'Otros');
CREATE TYPE payment_status AS ENUM ('Pendiente', 'Pagado', 'Cancelado');

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    delivery_date TIMESTAMP,
    order_status order_status NOT NULL,

    product_type order_status NOT NULL,
    customization_details TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    size_or_weight TEXT NOT NULL,
    flavor TEXT NOT NULL,
    allergy_information TEXT,

    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    payment_status payment_status NOT NULL,
    payment_method payment_method NOT NULL,

    notes TEXT,
    order_history JSONB
);

-- Índices para búsquedas comunes
CREATE INDEX idx_order_status ON orders(order_status);
CREATE INDEX idx_order_date ON orders(order_date);
CREATE INDEX idx_delivery_date ON orders(delivery_date);

-- Datos de prueba
INSERT INTO orders (customer_name, customer_contact, order_date, delivery_date, order_status, product_type, customization_details, quantity, size_or_weight, flavor, allergy_information, total_price, payment_status, payment_method, notes, order_history)
VALUES
('Juan Pérez', 'juan.perez@example.com', '2025-01-10 10:00:00', '2025-01-15 15:00:00', 'Pendiente', 'Tarta', 'Tema de cumpleaños, color azul', 1, '1 kg', 'Chocolate', 'Sin nueces', 25.00, 'Pendiente', 'Efectivo', 'Entrega en la tarde', '{"status_changes": [{"status": "Pendiente", "timestamp": "2025-01-10T10:00:00"}]}'),
('María López', 'maria.lopez@example.com', '2025-01-11 12:00:00', '2025-01-18 18:00:00', 'En preparación', 'Galletas', 'Forma de corazón, color rojo', 12, 'N/A', 'Vainilla', 'Sin gluten', 15.00, 'Pagado', 'Tarjeta', 'Llamar antes de entregar', '{"status_changes": [{"status": "Pendiente", "timestamp": "2025-01-11T12:00:00"}, {"status": "En preparación", "timestamp": "2025-01-12T09:00:00"}]}'),
('Carlos García', 'carlos.garcia@example.com', '2025-01-12 09:30:00', '2025-01-20 10:00:00', 'Listo', 'Tarta', 'Tema de boda, flores blancas', 1, '2 kg', 'Red Velvet', 'Sin lactosa', 50.00, 'Pagado', 'Transferencia bancaria', 'Entrega antes del mediodía', '{"status_changes": [{"status": "Pendiente", "timestamp": "2025-01-12T09:30:00"}, {"status": "En preparación", "timestamp": "2025-01-13T14:00:00"}, {"status": "Listo", "timestamp": "2025-01-19T17:00:00"}]}');
