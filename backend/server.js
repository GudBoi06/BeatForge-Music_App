const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer"); 
const path = require("path");
const fs = require("fs"); 
const Razorpay = require("razorpay");
const crypto = require("crypto"); 
require("dotenv").config();

const auth = require("./middleware/authMiddleware.js"); 
const Sample = require("./models/Sample"); 
const User = require("./models/User"); 

const Contact = require("./models/Contact");
const Feedback = require("./models/Feedback");

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors()); 

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
app.use('/api/presets', require('./routes/presets'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const upload = multer({ storage: storage });

// --- SAMPLE ROUTES ---
app.post('/api/samples', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const cleanName = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "");
    
    const newSample = new Sample({ user: req.user.id, name: cleanName, fileUrl: fileUrl });
    await newSample.save();

    res.json({ id: newSample._id, name: newSample.name, file: newSample.fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Server Error");
  }
});

app.get('/api/samples', auth, async (req, res) => {
  try {
    const samples = await Sample.find({ user: req.user.id }).sort({ createdAt: -1 });
    const formattedSamples = samples.map(s => ({ id: s._id, name: s.name, file: s.fileUrl }));
    res.json(formattedSamples);
  } catch (err) {
    console.error("Fetch samples error:", err);
    res.status(500).send("Server Error");
  }
});

app.delete('/api/samples/:id', auth, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);
    if (!sample) return res.status(404).json({ msg: "Sample not found" });

    if (sample.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    const fileName = sample.fileUrl.split('/uploads/')[1];
    if (fileName) {
      const filePath = path.join(__dirname, 'uploads', fileName);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete physical file:", err);
      });
    }

    await sample.deleteOne();
    res.json({ msg: "Sample permanently deleted" });
  } catch (err) {
    console.error("Delete sample error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// 🌟 LANDING PAGE FORMS (Public Routes)
// ==========================================

// 1. Submit Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();
    res.status(200).json({ success: true, msg: "Message received" });
  } catch (err) {
    console.error("Contact Form Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
});

// 2. Submit Feedback Form
app.post('/api/feedback', async (req, res) => {
  try {
    const { rating, category, comment } = req.body;
    const newFeedback = new Feedback({ rating, category, comment });
    await newFeedback.save();
    res.status(200).json({ success: true, msg: "Feedback received" });
  } catch (err) {
    console.error("Feedback Form Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
});

// ==========================================
// --- RAZORPAY ROUTES ---
app.post('/api/create-razorpay-order', auth, async (req, res) => {
  try {
    const options = { amount: 49900, currency: "INR", receipt: `receipt_order_${Date.now()}` };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
      
      // 🌟 Database update happens here
      await User.findByIdAndUpdate(req.user.id, { isPro: true });
      
      console.log(`✅ SUCCESS: User ${req.user.id} permanently upgraded to Pro!`);
      res.json({ success: true, message: "Payment verified successfully" });
      
    } else {
      console.log("❌ FAILED: Invalid Razorpay Signature.");
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎧 BeatForge Backend running on port ${PORT}`);
});