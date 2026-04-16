const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");
const crypto    = require("crypto");
const Razorpay  = require("razorpay");
require("dotenv").config();

const auth     = require("./middleware/authMiddleware.js");
const Sample   = require("./models/Sample");
const User     = require("./models/User");
const Contact  = require("./models/Contact");
const Feedback = require("./models/Feedback");

// APP SETUP 
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/presets", require("./routes/presets"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, "uploads/"),
    filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
  }),
});

// HELPERS
const err500 = (res, e, msg = "Server Error") => { console.error(msg, e); res.status(500).send(msg); };

// SAMPLE ROUTES
app.post("/api/samples", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
    const sample = await Sample.create({
      user: req.user.id,
      name: req.body.name || req.file.originalname.replace(/\.[^/.]+$/, ""),
      fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
    });
    res.json({ id: sample._id, name: sample.name, file: sample.fileUrl });
  } catch (e) { err500(res, e, "Upload error"); }
});

app.get("/api/samples", auth, async (req, res) => {
  try {
    const samples = await Sample.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(samples.map((s) => ({ id: s._id, name: s.name, file: s.fileUrl })));
  } catch (e) { err500(res, e, "Fetch samples error"); }
});

app.delete("/api/samples/:id", auth, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);
    if (!sample) return res.status(404).json({ msg: "Sample not found" });
    if (sample.user.toString() !== req.user.id) return res.status(401).json({ msg: "User not authorized" });

    const fileName = sample.fileUrl.split("/uploads/")[1];
    if (fileName) fs.unlink(path.join(__dirname, "uploads", fileName), (e) => e && console.error("File delete failed:", e));

    await sample.deleteOne();
    res.json({ msg: "Sample permanently deleted" });
  } catch (e) { err500(res, e, "Delete sample error"); }
});

// LANDING PAGE FORMS
app.post("/api/contact", async (req, res) => {
  try {
    await Contact.create(req.body);
    res.json({ success: true, msg: "Message received" });
  } catch (e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

app.post("/api/feedback", async (req, res) => {
  try {
    await Feedback.create(req.body);
    res.json({ success: true, msg: "Feedback received" });
  } catch (e) { res.status(500).json({ success: false, msg: "Server Error" }); }
});

// RAZORPAY ROUTES
app.post("/api/create-razorpay-order", auth, async (req, res) => {
  try {
    const order = await razorpay.orders.create({ amount: 49900, currency: "INR", receipt: `receipt_${Date.now()}` });
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/verify-payment", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

    if (expected !== razorpay_signature) {
      console.log("❌ Invalid Razorpay Signature.");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    await User.findByIdAndUpdate(req.user.id, { isPro: true });
    console.log(`✅ User ${req.user.id} upgraded to Pro!`);
    res.json({ success: true, message: "Payment verified successfully" });
  } catch (e) { err500(res, e, "Payment Verification Error"); }
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🎧 BeatForge Backend running on port ${PORT}`));