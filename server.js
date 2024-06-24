const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize'); // Tambahkan Op untuk operator Sequelize
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Konfigurasi Sequelize
const sequelize = new Sequelize('db_kost', 'user_kost', 'kostcozy', {
    host: 'localhost',
    dialect: 'mysql',
});

// Definisi Model Product
const Product = sequelize.define('Product', {
    namaKost: { type: DataTypes.STRING, allowNull: false },
    ukuranKost: { type: DataTypes.STRING, allowNull: false },
    jumlahTotalKamar: { type: DataTypes.INTEGER, allowNull: false },
    jumlahKamarTersedia: { type: DataTypes.INTEGER, allowNull: false },
    hargaPerBulan: { type: DataTypes.INTEGER, allowNull: false },
    hargaPer3Bulan: { type: DataTypes.INTEGER, allowNull: false },
    hargaPer6Bulan: { type: DataTypes.INTEGER, allowNull: false },
    hargaPer12Bulan: { type: DataTypes.INTEGER, allowNull: false },
    alamat: { type: DataTypes.STRING, allowNull: false },
    kota: { type: DataTypes.STRING, allowNull: false },
    provinsi: { type: DataTypes.STRING, allowNull: false },
    fasilitasKamar: { type: DataTypes.JSON, allowNull: false },
    fasilitasBersama: { type: DataTypes.JSON, allowNull: false },
    peraturan: { type: DataTypes.JSON, allowNull: false },
    kategoriKost: { type: DataTypes.STRING, allowNull: false },
    fotoKost: { type: DataTypes.STRING },
    fotoLuarKamar: { type: DataTypes.STRING },
    fotoDalamKamar: { type: DataTypes.STRING }
});

// Definisi Model User
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    points: { type: DataTypes.INTEGER, defaultValue: 0 }, // Tambahkan kolom points
});

// Definisi Model Order
const Order = sequelize.define('Order', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  kostId: { type: DataTypes.INTEGER, allowNull: false },
  duration: { type: DataTypes.STRING, allowNull: false },
  totalPrice: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  paymentProof: { type: DataTypes.STRING, allowNull: true }  // Kolom baru
});

// Definisi Model Review
const Review = sequelize.define('Review', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    kostId: { type: DataTypes.INTEGER, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
});

// Mengatur Asosiasi
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });
Product.hasMany(Order, { foreignKey: 'kostId' });
Order.belongsTo(Product, { foreignKey: 'kostId' });

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });
Product.hasMany(Review, { foreignKey: 'kostId' });
Review.belongsTo(Product, { foreignKey: 'kostId' });

// Sinkronisasi Database
sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synchronized');
    })
    .catch((error) => {
        console.error('Unable to sync database:', error);
    });

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Inisialisasi Express
const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware untuk verifikasi token JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied, no token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied, invalid token' });
    }

    try {
        const decoded = jwt.verify(token, 'kostcozyjwt');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Endpoint untuk register user
app.post('/api/auth/register/user', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword, role: 'user' });
        res.status(201).json(user);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'An error occurred while registering the user' });
    }
});

// Endpoint untuk register admin
app.post('/api/auth/register/admin', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await User.create({ username, email, password: hashedPassword, role: 'admin' });
        res.status(201).json(admin);
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'An error occurred while registering the admin' });
    }
});

// Endpoint untuk login user atau admin
app.post('/api/auth/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const user = await User.findOne({ where: { username, role } });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, 'kostcozyjwt', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'An error occurred while logging in the user' });
    }
});

// Endpoint untuk mendapatkan produk berdasarkan ID
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByPk(id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'An error occurred while fetching the product' });
    }
});

// Endpoint untuk mendapatkan semua produk
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'An error occurred while fetching the products' });
    }
});

// Endpoint untuk membuat produk (hanya untuk admin)
app.post('/api/products', authenticateJWT, upload.fields([
    { name: 'fotoKost' },
    { name: 'fotoLuarKamar' },
    { name: 'fotoDalamKamar' }
]), async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, only admin can perform this action' });
    }
    try {
        const { 
            namaKost, ukuranKost, jumlahTotalKamar, jumlahKamarTersedia,
            hargaPerBulan, hargaPer3Bulan, hargaPer6Bulan, hargaPer12Bulan,
            alamat, kota, provinsi, fasilitasKamar, fasilitasBersama, peraturan, kategoriKost 
        } = req.body;

        const product = await Product.create({
            namaKost,
            ukuranKost,
            jumlahTotalKamar,
            jumlahKamarTersedia,
            hargaPerBulan,
            hargaPer3Bulan,
            hargaPer6Bulan,
            hargaPer12Bulan,
            alamat,
            kota,
            provinsi,
            fasilitasKamar: JSON.parse(fasilitasKamar),
            fasilitasBersama: JSON.parse(fasilitasBersama),
            peraturan: JSON.parse(peraturan),
            kategoriKost,
            fotoKost: req.files['fotoKost'] ? req.files['fotoKost'][0].path : null,
            fotoLuarKamar: req.files['fotoLuarKamar'] ? req.files['fotoLuarKamar'][0].path : null,
            fotoDalamKamar: req.files['fotoDalamKamar'] ? req.files['fotoDalamKamar'][0].path : null,
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'An error occurred while creating the product' });
    }
});

// Endpoint untuk memperbarui produk (hanya untuk admin)
app.put('/api/products/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, only admin can perform this action' });
    }
    try {
        const { id } = req.params;
        const { 
            namaKost, ukuranKost, jumlahTotalKamar, jumlahKamarTersedia,
            hargaPerBulan, hargaPer3Bulan, hargaPer6Bulan, hargaPer12Bulan,
            alamat, kota, provinsi, fasilitasKamar, fasilitasBersama, peraturan, kategoriKost 
        } = req.body;

        // Validasi data
        if (!namaKost || !ukuranKost || !jumlahTotalKamar || !jumlahKamarTersedia || !hargaPerBulan || !alamat || !kota || !provinsi || !kategoriKost) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const product = await Product.findByPk(id);
        if (product) {
            product.namaKost = namaKost;
            product.ukuranKost = ukuranKost;
            product.jumlahTotalKamar = jumlahTotalKamar;
            product.jumlahKamarTersedia = jumlahKamarTersedia;
            product.hargaPerBulan = hargaPerBulan;
            product.hargaPer3Bulan = hargaPer3Bulan;
            product.hargaPer6Bulan = hargaPer6Bulan;
            product.hargaPer12Bulan = hargaPer12Bulan;
            product.alamat = alamat;
            product.kota = kota;
            product.provinsi = provinsi;
            product.fasilitasKamar = typeof fasilitasKamar === 'string' ? JSON.parse(fasilitasKamar) : fasilitasKamar;
            product.fasilitasBersama = typeof fasilitasBersama === 'string' ? JSON.parse(fasilitasBersama) : fasilitasBersama;
            product.peraturan = typeof peraturan === 'string' ? JSON.parse(peraturan) : peraturan;
            product.kategoriKost = kategoriKost;
            await product.save();
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'An error occurred while updating the product' });
    }
});

// Endpoint untuk menghapus produk (hanya untuk admin)
app.delete('/api/products/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, only admin can perform this action' });
    }
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        if (product) {
            await product.destroy();
            res.json({ message: 'Product deleted' });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'An error occurred while deleting the product' });
    }
});

// Endpoint untuk membuat order (booking kost)
app.post('/api/orders', authenticateJWT, async (req, res) => {
  const { kostId, duration, totalPrice, usedPoints } = req.body;

  try {
    // Temukan user
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Periksa apakah user memiliki cukup points
    if (usedPoints > user.points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Buat order
    const order = await Order.create({
      userId: req.user.id,
      kostId,
      duration,
      totalPrice
    });

    // Kurangi points user
    if (usedPoints > 0) {
      user.points -= usedPoints;
      await user.save();
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'An error occurred while creating the order' });
  }
});

// Endpoint untuk mendapatkan daftar order pengguna atau semua order untuk admin
app.get('/api/orders', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let orders;

    if (role === 'admin') {
      orders = await Order.findAll({
        include: [
          { model: User, attributes: ['username'] },
          { model: Product, attributes: ['namaKost'] }
        ]
      });
    } else {
      orders = await Order.findAll({
        where: { userId },
        include: [
          { model: User, attributes: ['username'] },
          { model: Product, attributes: ['namaKost'] }
        ]
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'An error occurred while fetching the orders' });
  }
});

// Endpoint untuk mengupload bukti pembayaran
app.post('/api/orders/:orderId/upload-proof', authenticateJWT, upload.single('paymentProof'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByPk(orderId);

        if (order && order.userId === req.user.id) {
            order.paymentProof = req.file.path;
            await order.save();
            res.json({ message: 'Payment proof uploaded successfully' });
        } else {
            res.status(403).json({ error: 'You can only upload proof for your own orders' });
        }
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({ error: 'An error occurred while uploading the payment proof' });
    }
});

// Endpoint untuk mengupdate status order
app.put('/api/orders/:order_id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, only admin can perform this action' });
    }
    try {
        const { order_id } = req.params;
        const { status } = req.body;

        const order = await Order.findByPk(order_id, { include: User });
        if (order) {
            order.status = status;
            await order.save();

            if (status === 'confirmed') {
                // Hitung points, misalnya 10% dari totalPrice
                const points = Math.floor(order.totalPrice * 0.1);

                // Tambahkan points ke user
                const user = order.User;
                user.points += points;
                await user.save();

                res.json({ order, pointsAwarded: points });
            } else {
                res.json(order);
            }
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'An error occurred while updating the order' });
    }
});

// Endpoint untuk mengambil points user
app.get('/api/user/points', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['points']
        });
        if (user) {
            res.json({ points: user.points });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ error: 'An error occurred while fetching user points' });
    }
});

// Endpoint untuk mengupdate profil pengguna
app.put('/api/users/profile', authenticateJWT, async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findByPk(req.user.id);

        if (user) {
            user.username = username;
            user.email = email;
            await user.save();
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'An error occurred while updating the profile' });
    }
});

// Endpoint untuk mendapatkan profil pengguna
app.get('/api/users/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'An error occurred while fetching the profile' });
    }
});

// Endpoint untuk mendapatkan saran
app.get('/api/suggestions', async (req, res) => {
  try {
    const kota = await Product.findAll({ attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('kota')), 'kota']] });
    const kategoriKost = await Product.findAll({ attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('kategoriKost')), 'kategoriKost']] });
    const harga = await Product.findAll({ attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('hargaPerBulan')), 'hargaPerBulan']] });

    res.json({
      kota: kota.map(k => k.getDataValue('kota')),
      kategoriKost: kategoriKost.map(k => k.getDataValue('kategoriKost')),
      harga: harga.map(h => h.getDataValue('hargaPerBulan')),
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'An error occurred while fetching the suggestions' });
  }
});

// Endpoint untuk pencarian
app.get('/api/search', async (req, res) => {
  const { kota, kategoriKost, hargaMin, hargaMax } = req.query;
  try {
    const whereClause = {};

    if (kota) {
      whereClause.kota = { [Op.like]: `%${kota}%` };
    }

    if (kategoriKost) {
      whereClause.kategoriKost = { [Op.like]: `%${kategoriKost}%` };
    }

    if (hargaMin) {
      whereClause.hargaPerBulan = { [Op.gte]: hargaMin };
    }

    if (hargaMax) {
      whereClause.hargaPerBulan = whereClause.hargaPerBulan
        ? { ...whereClause.hargaPerBulan, [Op.lte]: hargaMax }
        : { [Op.lte]: hargaMax };
    }

    const products = await Product.findAll({ where: whereClause });
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'An error occurred while searching the products' });
  }
});

// Endpoint untuk menambahkan review dan rating kost
app.post('/api/products/:id/reviews', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  console.log("Review productId:", id);
  console.log("Review userId:", req.user.id);

  try {
    const order = await Order.findOne({
      where: {
        userId: req.user.id,
        kostId: id,
        status: 'confirmed',
      },
    });

    if (!order) {
      return res.status(403).json({ error: 'You can only review products you have confirmed orders for' });
    }

    const review = await Review.create({
      userId: req.user.id,
      kostId: id,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'An error occurred while adding the review' });
  }
});

// Endpoint untuk mendapatkan review dan rating kost
app.get('/api/products/:id/reviews', async (req, res) => {
    const { id } = req.params;
    try {
        const reviews = await Review.findAll({ where: { kostId: id } });
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'An error occurred while fetching the reviews' });
    }
});

// Jalankan server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
