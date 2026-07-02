const { jwt } = require("../../utils/config");
const AuthUser = require("../models/Auth.model");
const UserSchema = require("../models/users.model");
const bcrypt = require("bcrypt");
const { BadRequestError, NotFoundError } = require("../../utils/errors");
const globalService = require("../../helper/global-func");
const { default: mongoose } = require("mongoose");
const crudServices = require("../../helper/crudService");
const ReffParameter = require("../models/reffParam.model");
const EpisodeLikeModel = require("../models/EpisodeLike.model");
const EpisodeRatingModel = require("../models/EpisodeRating.model");
const UserMovieLikeModel = require("../models/UserMovieLike.model");
const UserMovieRatingModel = require("../models/UserMovieRating.model");
const WatchHistoryModel = require("../models/WatchHistory.model");
const RoleModel = require("../models/Role.model");
const LogActionModel = require("../models/LogAction.model");

const controller = {};

controller.Register = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    /* 
    #swagger.tags = ['Master Role']
    #swagger.summary = 'role user'
    #swagger.description = 'every user has role for access'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create role',
      schema: { $ref: '#/definitions/BodyAuthRegisterSchema' }
    }
  */
    const { token, guest_id, ...payload } = req.body;

    // komparasikan dengna yang ada di database
    const [isAvailable, defaultRole] = await Promise.all([
      AuthUser.findOne({ email: payload.email }).lean(),
      RoleModel.findOne({ name: "Members" }).lean(),
    ]);

    if (isAvailable) {
      throw new BadRequestError("Email has been register!");
    }

    if (!defaultRole) {
      throw new BadRequestError("Role not found!");
    }

    // lakukan enkripsi pada password
    payload.password = await bcrypt.hash(
      payload.password,
      parseInt(jwt.saltEncrypt),
    );

    const auth = new AuthUser({ ...payload });
    await auth.save({ session });

    const [userResult] = await UserSchema.create(
      [
        {
          auth_id: auth._id,
          device_token: token,
          name: auth.username,
          role_id: defaultRole._id,
        },
      ],
      { session },
    );

    // LOG ACTION
    await LogActionModel.create(
      [
        {
          target_id: userResult._id,
          source: UserSchema.collection.collectionName,
          activities: [
            {
              type: "CREATE",
              after: userResult,
            },
          ],
        },
      ],
      { session },
    );

    // update semua data yang memiliki guest_id sama dengan guest_id yang dikirimkan oleh user ketika login
    if (guest_id) {
      await Promise.all([
        EpisodeLikeModel.updateMany(
          { user_id: guest_id },
          { user_id: users.data._id, is_guest: false },
          { session },
        ),
        EpisodeRatingModel.updateMany(
          { user_id: guest_id },
          { user_id: users.data._id, is_guest: false },
          { session },
        ),
        UserMovieLikeModel.updateMany(
          { user_id: guest_id },
          { user_id: users.data._id, is_guest: false },
          { session },
        ),
        UserMovieRatingModel.updateMany(
          { user_id: guest_id },
          { user_id: users.data._id, is_guest: false },
          { session },
        ),
        WatchHistoryModel.updateMany(
          { user_id: guest_id },
          { user_id: users.data._id, is_guest: false },
          { session },
        ),
      ]);
    }

    // Jika semua operasi berhasil, commit transaksi
    await session.commitTransaction();

    res
      .status(200)
      .json({ status: true, message: "Register Success", data: null });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

controller.Login = async (req, res, next) => {
  const session = await mongoose.startSession();

  // PROTEKSI: Hanya jalankan transaksi jika MongoDB berjalan sebagai Replica Set / Sharded Cluster
  const useTransaction =
    mongoose.connection.replicaSet || process.env.NODE_ENV === "production";

  if (useTransaction) {
    session.startTransaction();
  }

  try {
    /*
    #swagger.tags = ['Master Role']
    #swagger.summary = 'role user'
    #swagger.description = 'every user has role for access'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create role',
      schema: { $ref: '#/definitions/BodyAuthLoginSchema' }
    }
    */
    const { email, password, guest_id } = req.body;

    // 1. Cari data kredensial di AuthUser
    const isAvailable = await crudServices.findOne(AuthUser, {
      query: { email },
      selectField: "-createdAt",
    });

    if (!isAvailable || !isAvailable.data) {
      throw new NotFoundError("Email not registered!");
    }

    // 2. Validasi Password
    const isMatch = await bcrypt.compare(password, isAvailable.data.password);
    if (!isMatch) {
      throw new BadRequestError("Please check your password!");
    }

    const populateField = [
      { path: "role_id", model: "Role", select: "_id name path_access" },
    ];

    // 3. Ambil data Profile User
    const users = await UserSchema.findOne({ auth_id: isAvailable.data._id })
      .select("-auth_id -device_token -created_at -updated_at")
      .populate(populateField)
      .lean(); // .lean() mengubah data menjadi objek literal JS biasa

    if (!users) {
      throw new NotFoundError("User profile data not found!");
    }

    const path_access = users.role_id.path_access;

    // 4. Transformasi format Role agar flat
    if (users.role_id) {
      users.role_name = users.role_id.name;
      delete users.role_id;
    } else {
      users.role_name = "Guest";
    }

    // 5. Generate JWT Token
    const token = globalService.generateJwtToken({
      email,
      name: isAvailable.data.username,
    });

    // 6. Migrasi data Guest ke User Terdaftar (jika ada guest_id)
    if (guest_id) {
      // Masukkan opsi session hanya jika transaksi aktif
      const options = useTransaction ? { session } : {};

      await Promise.all([
        EpisodeLikeModel.updateMany(
          { user_id: guest_id },
          { user_id: users._id, is_guest: false },
          options,
        ),
        EpisodeRatingModel.updateMany(
          { user_id: guest_id },
          { user_id: users._id, is_guest: false },
          options,
        ),
        UserMovieLikeModel.updateMany(
          { user_id: guest_id },
          { user_id: users._id, is_guest: false },
          options,
        ),
        UserMovieRatingModel.updateMany(
          { user_id: guest_id },
          { user_id: users._id, is_guest: false },
          options,
        ),
        WatchHistoryModel.updateMany(
          { user_id: guest_id },
          { user_id: users._id, is_guest: false },
          options,
        ),
      ]);
    }

    if (useTransaction) {
      await session.commitTransaction();
    }

    // PERBAIKAN FATAL: Karena pakai .populate().lean(), users sudah bersih berbentuk objek biasa.
    // Tidak perlu memanggil .data._doc lagi karena akan menghasilkan undefined.
    res.status(200).json({
      status: true,
      message: "Login success!",
      data: {
        ...users,
        token,
        path_access: path_access ?? [],
      },
    });
  } catch (err) {
    if (useTransaction && session.inTransaction()) {
      await session.abortTransaction();
    }
    next(err);
  } finally {
    session.endSession();
  }
};

controller.recoveryPassword = async (req, res, next) => {
  /*
    #swagger.tags = ['Master Role']
    #swagger.summary = 'role user'
    #swagger.description = 'every user has role for access'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create role',
      schema: { $ref: '#/definitions/BodyAuthForgotSchema' }
    }
  */
  try {
    const { email, password, confirm_password } = req.body;

    const isAvailable = await AuthUser.findOne({ email });

    if (!isAvailable) {
      throw new BadRequestError("Email not found!");
    }

    if (password !== confirm_password) {
      throw new BadRequestError("Please check your password!");
    }

    const result = await crudServices.update(AuthUser, {
      fieldSearch: { email },
      data: {
        password: await bcrypt.hash(password, parseInt(jwt.saltEncrypt)),
      },
    });

    const token = globalService.generateJwtToken({
      email,
      name: result.data.username,
    });

    res.status(200).json({
      status: true,
      message: "Login success!",
      data: {
        _id: result.data._id,
        name: result.data.username,
        email: result.data.email,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

controller.uploadFile = async (req, res, next) => {
  /*
    #swagger.tags = ['UPLOAD IMAGES']
    #swagger.summary = 'this API for upload images'
    #swagger.description = 'untuk referensi group'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['proofs'] = {
      in: 'formData',
      type: 'array',
      required: true,
      description: 'Some description...',
      collectionFormat: 'multi',
      items: { type: 'file' }
    }
  */
  try {
    const fileResult = await globalService.uploadFiles(req.files.proofs);
    const _temp = fileResult.map((item) => {
      return { _id: item.id, path: item.path };
    });

    res
      .status(200)
      .json({ status: true, message: "succcess created images", data: _temp });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
