const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const ejs = require("ejs");
const multer = require("multer");
const app = express();
const port = 3000;

// Set up EJS as template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session management
app.use(
  session({
    secret: "pharmacy_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Lucky@6148",
  database: "pharmacy_ecommerce",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: " + err.stack);
    return;
  }
  console.log("Connected to database.");
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/");
  }
};
// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // folder to save files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
    // example: 1695521449234.png
  },
});

// Init upload
const upload = multer({ storage: storage });

// Single file upload (input name="myfile")
app.post("/upload", upload.single("myfile"), (req, res) => {
  try {
    res.send({
      message: "File uploaded successfully!",
      file: req.file,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// Multiple files upload (input name="photos")
app.post("/uploads", upload.array("photos", 5), (req, res) => {
  try {
    res.send({
      message: "Files uploaded successfully!",
      files: req.files,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// Routes
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/medicines");
  }
  res.render("login", { error: null, success: null });
});

app.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/medicines");
  }
  res.render("register", { error: null, success: null });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ?";
  db.execute(query, [email], async (err, results) => {
    if (err) {
      return res.render("login", { error: "Database error", success: null });
    }

    if (results.length === 0) {
      return res.render("login", {
        error: "Invalid email or password",
        success: null,
      });
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        // Store user in session (without password)
        const { password, ...userWithoutPassword } = user;
        req.session.user = userWithoutPassword;

        res.redirect("/medicines");
      } else {
        res.render("login", {
          error: "Invalid email or password",
          success: null,
        });
      }
    } catch (error) {
      res.render("login", { error: "Internal server error", success: null });
    }
  });
});

app.post("/register", async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  // Validation
  if (password !== confirmPassword) {
    return res.render("register", {
      error: "Passwords do not match",
      success: null,
    });
  }

  try {
    // Check if user already exists
    const checkUserQuery = "SELECT * FROM users WHERE email = ? OR phone = ?";
    db.execute(checkUserQuery, [email, phone], async (err, results) => {
      if (err) {
        return res.render("register", {
          error: "Database error",
          success: null,
        });
      }

      if (results.length > 0) {
        return res.render("register", {
          error: "User with this email or phone already exists",
          success: null,
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const insertQuery =
        "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)";
      db.execute(
        insertQuery,
        [name, email, phone, hashedPassword],
        (err, results) => {
          if (err) {
            return res.render("register", {
              error: "Error creating user",
              success: null,
            });
          }

          res.render("login", {
            error: null,
            success: "Registration successful. Please login.",
          });
        }
      );
    });
  } catch (error) {
    res.render("register", { error: "Internal server error", success: null });
  }
});

app.get("/medicines", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Fetch medicines from database
  const query = `
        SELECT m.*, c.name as category_name
        FROM medicines m
        LEFT JOIN categories c ON m.category_id = c.category_id
    `;

  db.execute(query, (err, results) => {
    if (err) {
      return res.render("medicines", {
        user: req.session.user,
        medicines: [],
        cartCount: cartCount,
        error: "Error fetching medicines",
      });
    }

    res.render("medicines", {
      user: req.session.user,
      medicines: results,
      cartCount: cartCount,
      error: null,
    });
  });
});

// Categories page
app.get("/categories", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const query = "SELECT * FROM categories";
  db.execute(query, (err, results) => {
    if (err) {
      return res.render("categories", {
        user: req.session.user,
        categories: [],
        cartCount: cartCount,
        error: "Error fetching categories",
      });
    }

    res.render("categories", {
      user: req.session.user,
      categories: results,
      cartCount: cartCount,
      error: null,
    });
  });
});

// Prescriptions page (upload form)
app.get("/prescriptions", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  res.render("prescription", {
    user: req.session.user,
    cartCount: cartCount,
    error: null,
    success: null,
  });
});

// Contact page
app.get("/contact", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  res.render("contact", {
    user: req.session.user,
    cartCount: cartCount,
    error: null,
    success: null,
  });
});

// Contact form submit
app.post("/contact", requireAuth, (req, res) => {
  const { name, email, message } = req.body;
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (!name || !email || !message) {
    return res.render("contact", {
      user: req.session.user,
      cartCount: cartCount,
      error: "Please fill in all fields",
      success: null,
    });
  }

  // For now we just render success. You can store this in DB later.
  res.render("contact", {
    user: req.session.user,
    cartCount: cartCount,
    error: null,
    success: "Thanks for reaching out. We'll get back to you soon!",
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/medicines");
    }
    res.redirect("/");
  });
});

// Cart routes
app.get("/cart", requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Fetch medicine details for cart items
  if (cart.length === 0) {
    return res.render("cart", {
      user: req.session.user,
      cart: [],
      total: 0,
      error: null,
    });
  }

  const medicineIds = cart.map((item) => item.medicine_id);
  const placeholders = medicineIds.map(() => "?").join(", ");
  const query = `SELECT * FROM medicines WHERE medicine_id IN (${placeholders})`;

  db.execute(query, medicineIds, (err, results) => {
    if (err) {
      return res.render("cart", {
        user: req.session.user,
        cart: [],
        total: 0,
        error: "Error fetching cart items",
      });
    }

    const cartWithDetails = cart.map((cartItem) => {
      const medicine = results.find(
        (m) => m.medicine_id === cartItem.medicine_id
      );
      return {
        ...cartItem,
        name: medicine ? medicine.name : "Unknown",
        price: medicine ? medicine.price : 0,
        image_url: medicine ? medicine.image_url : "",
      };
    });

    const total = cartWithDetails.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    res.render("cart", {
      user: req.session.user,
      cart: cartWithDetails,
      total: total,
      error: null,
    });
  });
});

app.post("/add-to-cart", requireAuth, (req, res) => {
  const { medicine_id, quantity } = req.body;
  const cart = req.session.cart || [];

  const existingItem = cart.find(
    (item) => item.medicine_id === parseInt(medicine_id)
  );

  if (existingItem) {
    existingItem.quantity += parseInt(quantity);
  } else {
    cart.push({
      medicine_id: parseInt(medicine_id),
      quantity: parseInt(quantity),
    });
  }

  req.session.cart = cart;
  res.redirect("/medicines");
});

app.post("/remove-from-cart", requireAuth, (req, res) => {
  const { medicine_id } = req.body;
  const cart = req.session.cart || [];

  req.session.cart = cart.filter(
    (item) => item.medicine_id !== parseInt(medicine_id)
  );
  res.redirect("/cart");
});

app.post("/update-cart", requireAuth, (req, res) => {
  const { medicine_id, quantity } = req.body;
  const cart = req.session.cart || [];

  const item = cart.find((item) => item.medicine_id === parseInt(medicine_id));
  if (item) {
    item.quantity = parseInt(quantity);
  }

  req.session.cart = cart;
  res.redirect("/cart");
});

// Order routes
app.post("/place-order", requireAuth, async (req, res) => {
  const cart = req.session.cart || [];
  const userId = req.session.user.user_id;

  if (cart.length === 0) {
    return res.redirect("/cart");
  }

  try {
    // Get medicine IDs from cart
    const medicineIds = cart.map((item) => item.medicine_id);

    // Fetch prices for all cart items in one query
    const placeholders = medicineIds.map(() => "?").join(", ");
    const query = `SELECT medicine_id, price FROM medicines WHERE medicine_id IN (${placeholders})`;
    db.execute(query, medicineIds, (err, results) => {
      if (err) {
        return res.render("cart", {
          user: req.session.user,
          cart: cart,
          total: 0,
          error: "Error fetching medicine prices",
        });
      }

      // Calculate total
      let total = 0;
      const cartWithPrices = cart.map((cartItem) => {
        const medicine = results.find(
          (m) => m.medicine_id === cartItem.medicine_id
        );
        const price = medicine ? medicine.price : 0;
        total += price * cartItem.quantity;
        return {
          ...cartItem,
          price: price,
        };
      });

      // Insert order
      const orderQuery =
        "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, 'pending')";
      db.execute(orderQuery, [userId, total], (err, orderResults) => {
        if (err) {
          return res.render("cart", {
            user: req.session.user,
            cart: cart,
            total: total,
            error: "Error placing order",
          });
        }

        const orderId = orderResults.insertId;

        // Insert order items
        cartWithPrices.forEach((item) => {
          const itemQuery =
            "INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)";
          db.execute(
            itemQuery,
            [orderId, item.medicine_id, item.quantity, item.price],
            (err) => {
              if (err) {
                console.error("Error inserting order item:", err);
              }
            }
          );
        });

        // Clear cart
        req.session.cart = [];

        res.redirect(`/order-confirmation/${orderId}`);
      });
    });
  } catch (error) {
    res.render("cart", {
      user: req.session.user,
      cart: cart,
      total: 0,
      error: "Internal server error",
    });
  }
});

app.get("/order-confirmation/:orderId", requireAuth, (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.session.user.user_id;

  const query = `
    SELECT o.*, oi.*, m.name, m.image_url
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN medicines m ON oi.medicine_id = m.medicine_id
    WHERE o.order_id = ? AND o.user_id = ?
  `;

  db.execute(query, [orderId, userId], (err, results) => {
    if (err || results.length === 0) {
      return res.redirect("/medicines");
    }

    const order = results[0];
    const orderItems = results;

    res.render("order", {
      user: req.session.user,
      order: order,
      orderItems: orderItems,
      error: null,
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Pharmacy e-commerce server running on port ${port}`);
});
