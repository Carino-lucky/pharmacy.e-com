CREATE DATABASE pharmacy_ecommerce;
USE pharmacy_ecommerce;


CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(10) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'pharmacist', 'admin', 'delivery') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);


CREATE TABLE medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    prescription_required BOOLEAN DEFAULT FALSE,
    stock INT DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);


CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    file_url VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'approved', 'on_the_way', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    medicine_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);


CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('mpesa', 'paypal', 'card', 'cash') DEFAULT 'cash',
    status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

INSERT INTO users (name, email, phone, password, role) VALUES
('Calvin Daye', 'calvin@example.com', '0712345678', 'hashed_password1', 'customer'),
('Briannah blue', 'blue@example.com', '0722334455', 'hashed_password2', 'customer'),
('Dr. Smith', 'smith@pharmacy.com', '0798765432', 'hashed_password3', 'pharmacist'),
('Admin User', 'admin@pharmacy.com', '0700112233', 'hashed_password4', 'admin'),
('Paul Rider', 'paul@delivery.com', '0733445566', 'hashed_password5', 'delivery');


INSERT INTO categories (name, description) VALUES
('Pain Relief', 'Medicines for headache, body pain, etc.'),
('Antibiotics', 'Prescription required antibiotics.'),
('Vitamins & Supplements', 'Nutritional supplements.'),
('Cough & Cold', 'Medicines for flu, cough, and cold.');


INSERT INTO medicines (category_id, name, description, price, prescription_required, stock, image_url) VALUES
(1, 'Paracetamol 500mg', 'Pain reliever and fever reducer.', 100.00, FALSE, 200, 'images/paracetamol.jpg'),
(1, 'Ibuprofen 200mg', 'Anti-inflammatory pain reliever.', 250.00, FALSE, 150, 'images/ibuprofen.jpg'),
(2, 'Amoxicillin 500mg', 'Antibiotic for bacterial infections.', 450.00, TRUE, 100, 'images/amoxicillin.jpg'),
(3, 'Vitamin C 1000mg', 'Boosts immunity.', 300.00, FALSE, 300, 'images/vitamin_c.jpg'),
(4, 'Cough Syrup 100ml', 'Relieves cough and sore throat.', 200.00, FALSE, 120, 'images/cough_syrup.jpg');


INSERT INTO prescriptions (user_id, file_url, status) VALUES
(1, 'uploads/prescriptions/Calvin_prescription.pdf', 'pending'),
(2, 'uploads/prescriptions/Briannah_prescription.pdf', 'approved');


INSERT INTO orders (user_id, total_price, status) VALUES
(1, 350.00, 'pending'),
(2, 650.00, 'approved');

INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES
(1, 1, 2, 200.00),   -- Calvin ordered 2 Paracetamol
(1, 5, 1, 150.00),   -- Calvin ordered 1 Cough Syrup
(2, 3, 1, 450.00),   -- Briannah ordered Amoxicillin (needs prescription)
(2, 4, 2, 200.00);   -- Briannah ordered 2 Vitamin C


INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES
(1, 350.00, 'mpesa', 'paid', NOW()),
(2, 650.00, 'card', 'paid', NOW());
