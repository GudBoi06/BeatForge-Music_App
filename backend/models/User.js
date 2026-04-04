const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isPro: { type: Boolean, default: false }
});

// Hash password before saving to the database
UserSchema.pre("save", async function () {
  // If the password wasn't modified, just return and let Mongoose continue
  if (!this.isModified("password")) return;
  
  // Generate the salt and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// 🌟 CASCADING DELETE HOOK (Modern Async)
// ==========================================
// This automatically runs right before User.findByIdAndDelete() executes.
UserSchema.pre("findOneAndDelete", async function () {
  try {
    // 1. Get the ID of the user that is about to be deleted
    const userId = this.getQuery()["_id"];

    // 2. Delete all Samples owned by this user
    await mongoose.model("Sample").deleteMany({ user: userId });

    // 3. Delete all Presets owned by this user 
    // (If your preset model is named something else, update "Preset" below)
    if (mongoose.models.Preset) {
      await mongoose.model("Preset").deleteMany({ user: userId });
    }

    console.log(`🧹 Cleanup complete: Wiped all data for user ${userId}`);
  } catch (err) {
    console.error("Error during cascading delete:", err);
  }
});

module.exports = mongoose.model("User", UserSchema);