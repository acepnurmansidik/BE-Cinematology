const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import Model
const { urlDb } = require("../utils/config");
const globalService = require("../helper/global-func");
const AuthUserModel = require("../app/models/auth.model");
const roleModel = require("../app/models/role.model");
const usersModel = require("../app/models/users.model");
const GenreModel = require("../app/models/Genre.model");

const runSeeder = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("\n=== Connected to Database for Seeding ===");

    // ==========================================
    // SEEDER 1: PROSES MEMBUAT ROLES
    // ==========================================
    console.log("Seeding Roles...");

    const rolesToSeed = [{ name: "Ultra Admin" }, { name: "Members" }];
    const seededRoles = {};

    for (const roleData of rolesToSeed) {
      const slug = globalService.createSlug(roleData.name);

      const role = await roleModel.findOneAndUpdate(
        { slug: slug },
        {
          name: roleData.name,
          slug: slug,
          is_delete: false,
        },
        {
          upsert: true,
          returnDocument: "after",
          session,
          setDefaultsOnInsert: true,
        },
      );

      // Simpan object ID role ke dalam memori untuk dipakai saat seeding user
      seededRoles[slug] = role._id;
    }
    console.log("✅ Roles seeded successfully!");

    // ==========================================
    // SEEDER 2: PROSES MEMBUAT AKUN SUPER ADMIN
    // ==========================================
    console.log("Seeding Super Admin Account...");

    const adminEmail = "superadmin@mail.com";
    const adminUsername = "superadmin";

    // Hash password sebelum disimpan ke database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    // A. Upsert ke tabel AuthUser terlebih dahulu
    const authUser = await AuthUserModel.findOneAndUpdate(
      { email: adminEmail },
      {
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        is_delete: false,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        session,
      },
    );

    // B. Upsert ke tabel User (Menghubungkan auth_id dan role_id)
    const superAdminRoleId = seededRoles["ultra-admin"];

    const userProfile = await usersModel.findOneAndUpdate(
      { auth_id: authUser._id },
      {
        auth_id: authUser._id,
        name: "Akun Super Admin",
        role_id: superAdminRoleId,
        device_token: "",
        subscription_info: {
          status: "none",
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        session,
      },
    );
    console.log("✅ Super Admin account seeded successfully!");

    // ==========================================
    // SEEDER 3: PROSES MEMBUAT GENRES (BARU)
    // ==========================================
    console.log("Seeding Genres...");

    // Daftar genre film umum dan dewasa (18+)
    const genresToSeed = [
      // === GENRE UMUM / MAINSTREAM ===
      { name: "Action" },
      { name: "Adventure" },
      { name: "Animation" },
      { name: "Comedy" },
      { name: "Crime" },
      { name: "Documentary" },
      { name: "Drama" },
      { name: "Family" },
      { name: "Fantasy" },
      { name: "History" },
      { name: "Horror" },
      { name: "Music" },
      { name: "Mystery" },
      { name: "Romance" },
      { name: "Sci-Fi" },
      { name: "Thriller" },
      { name: "War" },
      { name: "Western" },

      // === SUB-GENRE POPULER & ANIME/MANGA ===
      { name: "Isekai" },
      { name: "Mecha" },
      { name: "Slice of Life" },
      { name: "Sports" },
      { name: "Supernatural" },
      { name: "Musical" },
      { name: "Cyberpunk" },
      { name: "Steampunk" },
      { name: "Psychological" },
      { name: "School" },
      { name: "Shounen" },
      { name: "Shoujo" },
      { name: "Seinen" },
    ];

    for (const genreData of genresToSeed) {
      // Standarisasi name menjadi lowercase sebelum di-slug (mengikuti aturan di controller genre Anda sebelumnya)
      const formattedName = genreData.name.toLowerCase();
      const slug = globalService.createSlug(formattedName);

      await GenreModel.findOneAndUpdate(
        { slug: slug }, // Cari berdasarkan slug uniknya
        {
          name: formattedName,
          slug: slug,
          is_adult: genreData.is_adult, // Otomatis terset true/false sesuai array di atas
          is_new: false,
          is_delete: false,
        },
        {
          upsert: true,
          returnDocument: "after",
          session,
          setDefaultsOnInsert: true,
        },
      );
    }
    console.log("✅ Genres seeded successfully!");

    // Commit semua transaksi jika tidak ada error
    await session.commitTransaction();
    console.log("\n=== Seeder completed successfully! ===");
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("❌ Seeder failed with error:", error);
  } finally {
    await session.endSession();
  }
};

// Jalankan Seeder
module.exports = runSeeder;
