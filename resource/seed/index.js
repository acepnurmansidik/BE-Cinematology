const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const RoleModel = require("../app/models/Role.model");
const globalService = require("../helper/global-func");
const usersModel = require("../app/models/users.model");
const GenreModel = require("../app/models/Genre.model");
const { USER_IAM } = require("../utils/etc/permission");
const ModuleModel = require("../app/models/Module.model");
const MovieModel = require("../app/models/Movie.model");
const StudioModel = require("../app/models/Studio.model");
const AuthorModel = require("../app/models/Author.model");
const ActorModel = require("../app/models/Actor.model");
const AuthUserModel = require("../app/models/Auth.model");

const runMainSeeder = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const fullActions = {
    view: true,
    create: true,
    update: true,
    delete: true,
    import: true,
    export: true,
    pdf: true,
    whatsapp: true,
  };

  try {
    const defaultActions = [
      "view",
      "create",
      "update",
      "delete",
      "import",
      "export",
      "pdf",
      "whatsapp",
    ];

    // ==========================================
    // SEEDER 1: PROSES MEMBUAT MODULE
    // ==========================================
    for (const mod of USER_IAM) {
      const processedModule = {
        name: mod.name,
        title: mod.title,
        slug: globalService.createSlug(mod.name),
        permission: mod.permission.map((perm) => ({
          icon: perm.icon,
          menu_name: perm.menu_name,
          path: perm.path,
          actions: perm.actions,
          children: perm.children.map((child) => ({
            name: child.name,
            path: child.path,
            actions: child.actions,
          })),
        })),
      };

      await ModuleModel.findOneAndUpdate(
        { slug: processedModule.slug },
        { $set: processedModule },
        { upsert: true, session },
      );
    }
    console.log("✅ [SEEDERS] Modules upserted successfully!");

    // ==========================================
    // SEEDER 2: PROSES MEMBUAT ROLES
    // ==========================================

    const allModules = await ModuleModel.find({}).session(session);

    const roleSlug = "super-ultraman";
    const superUltramanData = {
      name: "Super Ultraman",
      slug: roleSlug,
      has_access_module: [], // Inisialisasi array kosong
      path_access: [],
    };

    // Helper function untuk mengubah array ["view", "create"] menjadi { view: true, create: true }
    const arrayToObjectActions = (actionsArray) => {
      const actionsObj = {};
      if (Array.isArray(actionsArray)) {
        actionsArray.forEach((action) => {
          actionsObj[action] = true;
        });
      } else if (actionsArray instanceof Map) {
        // Jika sudah berupa Map, konversi ke objek
        Object.fromEntries(actionsArray).forEach((val, key) => {
          actionsObj[key] = val;
        });
      } else {
        // Jika sudah objek, kembalikan apa adanya
        return actionsArray;
      }
      return actionsObj;
    };

    // Mapping has_access_module dengan pembersihan mendalam
    for (const mod of allModules) {
      const moduleItem = {
        name: mod.name,
        title: mod.title,
        permission: [],
      };

      for (const perm of mod.permission) {
        const hasChildren = perm.children && perm.children.length > 0;

        // Jika ada children, actions parent kosong, jika tidak, konversi ke object
        const permActions = hasChildren
          ? {}
          : arrayToObjectActions(perm.actions);

        const permissionItem = {
          icon: perm.icon,
          menu_name: perm.menu_name,
          path: perm.path,
          actions: permActions,
          children: [],
        };

        if (hasChildren) {
          for (const child of perm.children) {
            permissionItem.children.push({
              name: child.name,
              path: child.path,
              actions: arrayToObjectActions(child.actions), // Konversi ke object
            });
          }
        }

        moduleItem.permission.push(permissionItem);
      }
      superUltramanData.has_access_module.push(moduleItem);
    }

    // Logika path_access dengan konversi ke object
    for (const mod of allModules) {
      for (const perm of mod.permission) {
        if (perm.children && perm.children.length > 0) {
          for (const child of perm.children) {
            superUltramanData.path_access.push({
              path: child.path,
              actions: arrayToObjectActions(child.actions),
            });
          }
        } else {
          superUltramanData.path_access.push({
            path: perm.path,
            actions: arrayToObjectActions(perm.actions),
          });
        }
      }
    }

    const role = await RoleModel.findOneAndUpdate(
      { slug: roleSlug },
      { $set: superUltramanData },
      { upsert: true, returnDocument: "after", session }, // Gunakan returnDocument: 'after'
    );

    // PERBAIKAN: Gunakan findOneAndUpdate agar aman dijalankan berkali-kali (idempotent)
    await RoleModel.findOneAndUpdate(
      { slug: "members" },
      {
        $set: {
          slug: "members",
          name: "Members",
          has_access_module: [],
          path_access: [],
        },
      },
      { upsert: true, returnDocument: "after", session }, // Gunakan returnDocument: 'after'
    );
    console.log("✅ [SEEDERS] Role upserted successfully!");

    // ==========================================
    // SEEDER 3: PROSES MEMBUAT AKUN SUPER ADMIN
    // ==========================================
    const adminEmail = "superultraman@mail.com";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const authUser = await AuthUserModel.findOneAndUpdate(
      { email: adminEmail },
      {
        username: "superultraman",
        email: adminEmail,
        password: hashedPassword,
        is_delete: false,
      },
      { upsert: true, returnDocument: "after", session },
    );

    await usersModel.findOneAndUpdate(
      { auth_id: authUser._id },
      {
        auth_id: authUser._id,
        name: "Akun Super Admin",
        role_id: role._id,
        device_token: "",
        subscription_info: { status: "none" },
      },
      { upsert: true, returnDocument: "after", session },
    );

    console.log("✅ [SEEDERS] Super Admin account & Role linked successfully!");

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("❌ Seeder failed with error:", error);
  } finally {
    await session.endSession();
  }
};

const runSecondarySeeder = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const fullActions = {
    view: true,
    create: true,
    update: true,
    delete: true,
    import: true,
    export: true,
    pdf: true,
    whatsapp: true,
  };

  try {
    // ==========================================
    // SEEDER 1: PROSES MEMBUAT GENRES (BARU)
    // ==========================================
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
    console.log("✅ [SEEDERS] Genres upserted successfully!");

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("❌ Seeder failed with error:", error);
  } finally {
    await session.endSession();
  }
};

const runMovieSeeder = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(
      "⏳ [SEEDER] Memulai seeding entitas pendukung (Studio, Author, Actor)...",
    );

    // ==========================================
    // STEP 1: SEEDING DATA STUDIO
    // ==========================================
    const studios = ["Neo Tokyo Pro", "Aetheria Pictures", "Apex Cinema Labs"];
    const studioMap = {};
    for (const name of studios) {
      const slug = globalService.createSlug(name.toLowerCase());
      const doc = await StudioModel.findOneAndUpdate(
        { slug },
        { name, slug },
        { upsert: true, returnDocument: "after", session },
      );
      studioMap[slug] = doc._id;
    }

    // ==========================================
    // STEP 2: SEEDING DATA AUTHOR / DIRECTOR
    // ==========================================
    const authors = ["Christopher Nolan", "Hideo Kojima", "Guillermo del Toro"];
    const authorMap = {};
    for (const name of authors) {
      const slug = globalService.createSlug(name.toLowerCase());
      const doc = await AuthorModel.findOneAndUpdate(
        { slug },
        { name, slug },
        { upsert: true, returnDocument: "after", session },
      );
      authorMap[slug] = doc._id;
    }

    // ==========================================
    // STEP 3: SEEDING DATA ACTOR
    // ==========================================
    const actors = [
      "Keanu Reeves",
      "Timothée Chalamet",
      "Scarlett Johansson",
      "Tom Hardy",
    ];
    const actorMap = {};
    for (const name of actors) {
      const slug = globalService.createSlug(name.toLowerCase());
      const doc = await ActorModel.findOneAndUpdate(
        { slug },
        { name, slug },
        { upsert: true, returnDocument: "after", session },
      );
      actorMap[slug] = doc._id;
    }

    // ==========================================
    // STEP 4: AMBIL DATA GENRE YANG SUDAH ADA
    // ==========================================
    const actionG = await GenreModel.findOne({ slug: "action" }).session(
      session,
    );
    const scifiG = await GenreModel.findOne({ slug: "sci-fi" }).session(
      session,
    );
    const adventureG = await GenreModel.findOne({ slug: "adventure" }).session(
      session,
    );
    const horrorG = await GenreModel.findOne({ slug: "horror" }).session(
      session,
    );
    const dramaG = await GenreModel.findOne({ slug: "drama" }).session(session);

    // ==========================================
    // STEP 5: DAFTAR 10 DATA MOVIE LENGKAP
    // ==========================================
    const moviesToSeed = [
      {
        title: "The Neon Vanguard",
        genres_name: "Action, Sci-Fi, Cyberpunk",
        genres: [actionG?._id, scifiG?._id].filter(Boolean),
        studio_id: studioMap["neo-tokyo-pro"],
        author_id: authorMap["hideo-kojima"],
        actors: [
          actorMap["keanu-reeves"],
          actorMap["scarlett-johansson"],
        ].filter(Boolean),
      },
      {
        title: "Chronicles of the Lost Oasis",
        genres_name: "Adventure, Fantasy",
        genres: [adventureG?._id].filter(Boolean),
        studio_id: studioMap["aetheria-pictures"],
        author_id: authorMap["guillermo-del-toro"],
        actors: [actorMap["timothee-chalamet"]],
      },
      {
        title: "Shadows in the Attic",
        genres_name: "Horror, Mystery",
        genres: [horrorG?._id].filter(Boolean),
        studio_id: studioMap["apex-cinema-labs"],
        author_id: authorMap["guillermo-del-toro"],
        actors: [actorMap["scarlett-johansson"]],
      },
      {
        title: "Echoes of Yesterday",
        genres_name: "Drama, Romance",
        genres: [dramaG?._id].filter(Boolean),
        studio_id: studioMap["aetheria-pictures"],
        author_id: authorMap["christopher-nolan"],
        actors: [actorMap["timothee-chalamet"]],
      },
      {
        title: "Velocity Shift",
        genres_name: "Action, Thriller",
        genres: [actionG?._id].filter(Boolean),
        studio_id: studioMap["apex-cinema-labs"],
        author_id: authorMap["christopher-nolan"],
        actors: [actorMap["tom-hardy"], actorMap["keanu-reeves"]].filter(
          Boolean,
        ),
      },
      {
        title: "The Iron Fortress",
        genres_name: "Action, Mecha, Sci-Fi",
        genres: [actionG?._id, scifiG?._id].filter(Boolean),
        studio_id: studioMap["neo-tokyo-pro"],
        author_id: authorMap["hideo-kojima"],
        actors: [actorMap["tom-hardy"]],
      },
      {
        title: "Interstellar Horizon",
        genres_name: "Sci-Fi, Drama",
        genres: [scifiG?._id, dramaG?._id].filter(Boolean),
        studio_id: studioMap["aetheria-pictures"],
        author_id: authorMap["christopher-nolan"],
        actors: [actorMap["tom-hardy"], actorMap["timothee-chalamet"]].filter(
          Boolean,
        ),
      },
      {
        title: "Gridlock Protocol",
        genres_name: "Sci-Fi, Psychological",
        genres: [scifiG?._id].filter(Boolean),
        studio_id: studioMap["apex-cinema-labs"],
        author_id: authorMap["hideo-kojima"],
        actors: [actorMap["keanu-reeves"]],
      },
      {
        title: "Midnight Junction",
        genres_name: "Comedy, Slice of Life",
        genres: [dramaG?._id].filter(Boolean),
        studio_id: studioMap["neo-tokyo-pro"],
        author_id: authorMap["christopher-nolan"],
        actors: [actorMap["scarlett-johansson"]],
      },
      {
        title: "The Last Frontier",
        genres_name: "Western, Action",
        genres: [actionG?._id].filter(Boolean),
        studio_id: studioMap["apex-cinema-labs"],
        author_id: authorMap["guillermo-del-toro"],
        actors: [actorMap["tom-hardy"], actorMap["keanu-reeves"]].filter(
          Boolean,
        ),
      },
    ];

    // ==========================================
    // STEP 6: BULK INSERT / UPSERT MOVIES
    // ==========================================
    for (const movieData of moviesToSeed) {
      const movieSlug = globalService.createSlug(movieData.title.toLowerCase());

      await MovieModel.findOneAndUpdate(
        { slug: movieSlug },
        {
          title: movieData.title,
          slug: movieSlug,
          type: "movie",
          genres_name: movieData.genres_name,
          genres: movieData.genres,
          studio_id: movieData.studio_id || null, // Menghubungkan ID Studio
          author_id: movieData.author_id || null, // Menghubungkan ID Author (Director)
          actors: movieData.actors || [], // Menghubungkan Array ID Actor
          release_date: new Date(),
          thumbnail_id: null,
          is_delete: false,
        },
        {
          upsert: true,
          session,
          setDefaultsOnInsert: true,
        },
      );
    }

    await session.commitTransaction();
    console.log(
      "✅ [SEEDER] Sukses menyuntikkan 10 Film lengkap dengan relasi entitas!",
    );
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error("❌ [SEEDER] Gagal menjalankan seeder lengkap:", error);
  } finally {
    await session.endSession();
  }
};

module.exports = { runMainSeeder, runSecondarySeeder, runMovieSeeder };
