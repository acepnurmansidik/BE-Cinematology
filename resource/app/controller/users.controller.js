const { default: mongoose } = require("mongoose");
const {
  getOrSetCache,
  clearCache,
  setCache,
} = require("../../helper/redis-cache");
const bcrypt = require("bcrypt");
const { DateTime } = require("luxon");
const { jwt } = require("../../utils/config");
const RoleModel = require("../models/role.model");
const PlanModel = require("../models/Plan.model");
const UsersModel = require("../models/users.model");
const MovieModel = require("../models/Movie.model");
const AuthUserModel = require("../models/auth.model");
const EpisodeModel = require("../models/Episode.model");
const crudServices = require("../../helper/crudService");
const LogActionModel = require("../models/LogAction.model");
const EpisodeLikeModel = require("../models/EpisodeLike.model");
const SubscriptionModel = require("../models/Subscription.model");
const WatchHistoryModel = require("../models/WatchHistory.model");
const UserMovieLikeModel = require("../models/UserMovieLike.model");
const EpisodeRatingModel = require("../models/EpisodeRating.model");
const PaymentHistoryModel = require("../models/PaymentHistory.model");
const UserMovieRatingModel = require("../models/UserMovieRating.model");
const UserMovieActivityModel = require("../models/UserMovieActivity.model");
const CityStatMovieLikeModel = require("../models/CityStatMovieLike.model");
const CityStatMovieWatchModel = require("../models/CityStatMovieWatch.model");
const CityStatMovieGenreModel = require("../models/CityStatMovieGenre.model");
const CityStatMovieRatingModel = require("../models/CityStatMovieRating.model");
const CityStatEpisodeLikeModel = require("../models/CityStatEpisodeLike.model");
const CityStatEpisodeWatchModel = require("../models/CityStatEpisodeWatch.model");

const controller = {};

// CRUD USER
controller.getAllUser = async (req, res, next) => {
  /*
    #swagger.tags = ['USERS / IAM']
    #swagger.summary = 'User'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      { path: "role_id", model: "Role", select: "_id name path_access" },
      { path: "auth_id", model: "AuthUser", select: "_id username email" },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await UsersModel.countDocuments(query);
    const result = await crudServices.findAllPagination(UsersModel, {
      query,
      populateField,
      skip,
      limit,
    });
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.createUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email, password, role_id, username, ...profileData } = req.body;

    // Validasi tunggal untuk efisiensi
    const [existingUser, role] = await Promise.all([
      AuthUserModel.findOne({ email, is_delete: false })
        .session(session)
        .lean(), // Hemat memori, lebih cepat
      RoleModel.findById(role_id) // Lebih efisien daripada findOne({ _id: ... })
        .where({ is_delete: false })
        .session(session)
        .lean(),
    ]);

    if (existingUser)
      return res
        .status(401)
        .json({ status: false, message: "Email already registered!" });
    if (!role)
      return res
        .status(404)
        .json({ status: false, message: "Role not found!" });

    // Enkripsi password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS || 12),
    );

    // Create Auth User
    const [auth] = await AuthUserModel.create(
      [{ email, username, password: hashedPassword }],
      { session },
    );

    // Create User Profile
    const [user] = await UsersModel.create(
      [{ ...profileData, auth_id: auth._id, role_id }],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      code: 201,
      success: true,
      message: "User created successfully!",
      data: user,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

controller.updateUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    /*
      #swagger.tags = ['USERS / IAM']
      #swagger.summary = 'Update User'
      #swagger.parameters['id'] = { description: 'User ID (UsersModel ID)' }
      #swagger.parameters['obj'] = {
        in: 'body',
        schema: { $ref: '#/definitions/BodyUserIAMSchema' }
      }
    */
    const { id } = req.params;
    const { name, email, password, role_id, ...otherFields } = req.body;

    const isRoleExist = await RoleModel.findOne({ _id: role_id }).lean();

    if (!isRoleExist) {
      return res
        .status(404)
        .json({ status: true, message: "Role not found!", data: null });
    }

    // 1. Cari data user & auth_id
    const userProfile = await UsersModel.findById(id).session(session);
    if (!userProfile) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    // 2. Update AuthUserModel (Email & Password jika ada)
    const authUpdate = {};
    if (email) authUpdate.email = email;
    if (password) {
      authUpdate.password = await bcrypt.hash(
        password,
        parseInt(jwt.saltEncrypt || 12),
      );
    }

    if (Object.keys(authUpdate).length > 0) {
      await AuthUserModel.findByIdAndUpdate(userProfile.auth_id, authUpdate, {
        session,
      });
    }

    // 3. Update UsersModel (Profile)
    const updatedUser = await UsersModel.findByIdAndUpdate(
      id,
      {
        name: name || userProfile.name,
        role_id: role_id || userProfile.role_id,
        ...otherFields,
      },
      {
        new: true,
        session,
      },
    );

    await session.commitTransaction();
    res.status(200).json({
      code: 200,
      success: true,
      message: "User updated successfully!",
      data: updatedUser,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    await session.endSession();
  }
};

controller.deleteUser = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['USERS / IAM']
    #swagger.summary = 'User'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id role' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(UsersModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "User deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// USER TRANSACTION
controller.getAllTransaction = async (req, res, next) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'get user transaction for admin'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    if (req.login.role_name !== "ultraman") query.user_id = req.login._id;
    const populateField = [];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ status: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await PaymentHistoryModel.countDocuments(query);
    const result = await crudServices.findAllPagination(PaymentHistoryModel, {
      query,
      populateField,
      skip,
      limit,
    });
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getAllMovieHistoryUser = async (req, res, next) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'get user movie history for customer'
    #swagger.description = 'get user movie history'
    #swagger.parameters['guest_id'] = { default: '', description: 'guest id for user not login' }
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      {
        path: "movie_id",
        model: "Movie",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
    ];
    query.user_id = req.login
      ? req.login.user_id.toString()
      : req.query.guest_id;
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await WatchHistoryModel.countDocuments(query);
    const result = await crudServices
      .findAllPagination(WatchHistoryModel, {
        query,
        populateField,
        skip,
        limit,
      })
      .then((stats) =>
        stats.data.map((item) => {
          const movieData =
            item.movie_id?._doc ||
            (typeof item.movie_id?.toObject === "function"
              ? item.movie_id.toObject()
              : item.movie_id);

          return {
            ...movieData,
            duration_seconds: item.duration_seconds,
            last_watched_at: item.last_watched_at,
            progress_seconds: item.progress_seconds,
            episode_id: item.episode_id,
          };
        }),
      );

    res.status(200).json({
      success: true,
      message: "Data retrieved successfully!",
      data: result,
      page_size,
      current_page: Number(page),
    });
  } catch (err) {
    next(err);
  }
};

controller.createUserTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const logActions = [];
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'create user transaction'
    #swagger.description = 'create user transaction'
     #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyUserTransactionSchema' }
    }
  */
  try {
    const payload = req.body;
    const userLogin = req.login;

    // check planId exist
    const isExistPlanId = await PlanModel.findOne({
      _id: payload.plan_id,
    }).lean();
    if (isExistPlanId)
      return res
        .status(404)
        .json({ success: false, message: "Plan not found!", data: null });

    // do something with payment gateway here

    // if get failed response fro payment gateway, throw error and rollback transaction

    // update database after successful get response from payment gateway
    const resultSubscribe = await SubscriptionModel.create(
      [{ user_id: userLogin._id, plan_id: payload.plan_id }],
      { session },
    );
    logActions.push({
      type: "CREATE",
      target_id: resultSubscribe[0]._id, // id of the created document
      after: resultSubscribe[0],
      source: SubscriptionModel.collection.collectionName,
    });

    const resultPaymentHistory = await PaymentHistoryModel.create(
      [
        {
          user_id: userLogin._id,
          plan_id: planId,
          subscription_id: resultSubscribe[0]._id,
          ...payload,
        },
      ],
      { session },
    );
    logActions.push({
      type: "CREATE",
      target_id: resultPaymentHistory[0]._id, // id of the created document
      after: resultPaymentHistory[0],
      source: PaymentHistoryModel.collection.collectionName,
    });

    await LogActionModel.create(logActions, { session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User transaction created successfully!",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.getUserTransaction = async (req, res, next) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'get user transactio for customer'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    query.user_id = req.login._id;

    const page_size = await PaymentHistoryModel.countDocuments(query);
    const result = await crudServices.findAllPagination(PaymentHistoryModel, {
      query,
      populateField,
      skip,
      limit,
    });
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.userPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const logActions = [];
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'user payment'
    #swagger.description = 'user payment'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyUserPaymentSchema' }}
  */
  try {
    const gatewayId = req.params.id;

    const isPaymentHistoryExist = await PaymentHistoryModel.findOne({
      payment_gateway_id: gatewayId,
    }).lean();

    if (!isPaymentHistoryExist) {
      res.status(404).json({
        success: false,
        message: "Payment history not found!",
        data: null,
      });
    }

    const [userPaymentBefore, userSubscribeBefore, userBefore] =
      await Promise.all([
        PaymentHistoryModel.findOne({ _id: isPaymentHistoryExist._id }).lean(),
        SubscriptionModel.findOne({
          _id: isPaymentHistoryExist.subscription_id,
        }).lean(),
        UserModel.findOne({ _id: isPaymentHistoryExist.user_id }).lean(),
      ]);

    // checking payment status from payment gateway
    // if failed update subscription status to failed
    // if pending update subscription status to pending
    // if refunded update subscription status to refunded

    // if success update subscription status to active
    const resultPayment = await PaymentHistoryModel.findOneAndUpdate(
      { _id: isPaymentHistoryExist._id },
      { status: "success" },
      { session },
    );

    logActions.push({
      type: "UPDATE",
      target_id: resultPayment._id, // id of the created document
      before: userPaymentBefore,
      after: resultPayment,
      source: PaymentHistoryModel.collection.collectionName,
    });
    const resultSubscribe = await SubscriptionModel.findOneAndUpdate(
      { _id: isPaymentHistoryExist.subscription_id },
      { status: "active" },
      { session },
    );
    logActions.push({
      type: "UPDATE",
      target_id: userSubscribeBefore._id, // id of the created document
      before: userSubscribeBefore,
      after: resultSubscribe,
      source: SubscriptionModel.collection.collectionName,
    });
    const resultUser = await UserModel.findOneAndUpdate(
      { _id: isPaymentHistoryExist.user_id },
      {
        subscription_iinfo: {
          plan_id: isPaymentHistoryExist.plan_id,
          subscription_id: isPaymentHistoryExist.subscription_id,
          status: "active",
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // contoh set end date 1 bulan setelah pembayaran, sesuaikan dengan durasi plan
        },
      },
      { session },
    );

    logActions.push({
      type: "UPDATE",
      target_id: userBefore._id, // id of the created document
      before: userBefore,
      after: resultUser,
      source: UserModel.collection.collectionName,
    });

    await LogActionModel.create(logActions, { session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Payment processed successfully!",
      data: null,
    });

    // do something with payment gateway here
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

// USER ACTION WITH MOVIE LIKE, WATCH, RATING
controller.userMovieLike = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const logActions = [];
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'user like or unlike movie'
    #swagger.description = 'user like or unlike movie'
     #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyUserMovieLikeSchema' }
    }
  */
  try {
    const payload = req.body;
    const now = DateTime.now();
    const date_format = now.startOf("day").toFormat("yyyy/LL/dd");

    if (req.login) {
      payload.guest_id = req.login.user_id;
      payload.user_id = req.login.user_id;
      payload.is_guest = false;
    }
    if (payload.guest_id && !req.login) {
      payload.user_id = payload.guest_id;
      payload.guest_id = payload.guest_id;
      payload.is_guest = true;
    }
    let dEpisodeLike, dMovieLikeModel;
    const dMovie = await MovieModel.findOne({ _id: payload.movie_id })
      .select("_id title is_series type genres_name genres")
      .lean();

    const dMovieLikeBefore = await UserMovieLikeModel.findOne({
      user_id: payload.guest_id,
      movie_id: payload.movie_id,
    }).lean();

    if (!dMovie)
      return res
        .status(404)
        .json({ success: false, message: "Movie not found!", data: null });

    const arrayGenres = dMovie.genres_name
      .split(", ")
      .map((item) => item.replaceAll(" ", "-").toLowerCase().trim());

    // cek userMovie like
    const dMovieLikeAfter = await UserMovieLikeModel.findOneAndUpdate(
      { user_id: payload.guest_id, movie_id: payload.movie_id },
      payload,
      { upsert: true, returnDocument: "after", session },
    );

    const qUserGenreStat = {};
    const dPayloadMovie = {};
    const dPayloadEpisode = {};
    const dPayloadCityMovieLike = {
      location_raw: payload.location_raw,
      ...payload.location_raw,
    };
    const dPayloadCityMovieGenreLike = {
      location_raw: payload.location_raw,
      ...payload.location_raw,
    };
    // logika penentuan increment dan decrement total like dan unlike
    // ==========================================
    // KONDISI 1: USER BARU MELAKUKAN 'LIKE' (Sebelumnya belum pernah vote)
    // ==========================================
    if (dMovieLikeAfter.status_like == "like" && !dMovieLikeBefore) {
      // console.log(
      //   "KONDISI 1: USER BARU MELAKUKAN 'LIKE' (Sebelumnya belum pernah vote)",
      // );
      dPayloadMovie.$inc = { total_likes: 1 };
      dPayloadEpisode.$inc = { total_likes: 1 };
      dPayloadCityMovieLike.$inc = { total_users_likes: 1 };
      dPayloadCityMovieGenreLike.$inc = { total_genre_likes: 1 };

      // user movie like stats update for demographic genre,
      for (const everyGenre of arrayGenres) {
        qUserGenreStat[`${everyGenre.replaceAll("-", "_")}`] = 1;
      }
    }

    // ==========================================
    // KONDISI 2: USER BARU MELAKUKAN 'DISLIKE' (Sebelumnya belum pernah vote)
    // ==========================================
    if (dMovieLikeAfter.status_like == "dislike" && !dMovieLikeBefore) {
      // console.log(
      //   "KONDISI 2: USER BARU MELAKUKAN 'DISLIKE' (Sebelumnya belum pernah vote)",
      // );
      dPayloadMovie.$inc = { total_unlikes: 1 };
      dPayloadEpisode.$inc = { total_unlikes: 1 };
      dPayloadCityMovieLike.$inc = { total_users_unlikes: 1 };
      dPayloadCityMovieGenreLike.$inc = { total_genre_unlikes: 1 };

      // user movie like stats update for demographic genre,
      for (const everyGenre of arrayGenres) {
        qUserGenreStat[`${everyGenre.replaceAll("-", "_")}`] = -1;
      }
    }

    // ==========================================
    // KONDISI 3: USER MEMBATALKAN 'LIKE' (Mengubah dari 'like' menjadi 'none')
    // ==========================================
    if (
      dMovieLikeAfter.status_like == "none" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "like"
    ) {
      // console.log(
      //   "KONDISI 3: USER MEMBATALKAN 'LIKE' (Mengubah dari 'like' menjadi 'none')",
      // );
      // dPayloadMovie.$inc = { total_likes: -1 };
      dPayloadEpisode.$inc = { total_likes: -1 };
      dPayloadCityMovieLike.$inc = { total_users_likes: -1 };
      dPayloadCityMovieGenreLike.$inc = { total_genre_likes: -1 };
    }

    // ==========================================
    // KONDISI 4: USER MEMBATALKAN 'DISLIKE' (Mengubah dari 'dislike' menjadi 'none')
    // ==========================================
    if (
      dMovieLikeAfter.status_like == "none" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "dislike"
    ) {
      // console.log(
      //   "KONDISI 4: USER MEMBATALKAN 'DISLIKE' (Mengubah dari 'dislike' menjadi 'none')",
      // );
      // dPayloadMovie.$inc = { total_unlikes: -1 };
      dPayloadEpisode.$inc = { total_unlikes: -1 };
      dPayloadCityMovieLike.$inc = { total_users_unlikes: -1 };
      dPayloadCityMovieGenreLike.$inc = { total_genre_unlikes: -1 };
    }

    // ==========================================
    // KONDISI 5: USER SWAP/PINDAH PILIHAN DARI 'DISLIKE' KE 'LIKE'
    // ==========================================
    if (
      dMovieLikeAfter.status_like == "like" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "dislike"
    ) {
      // console.log(
      //   "KONDISI 5: USER SWAP/PINDAH PILIHAN DARI 'DISLIKE' KE 'LIKE'",
      // );
      // dPayloadMovie.$inc = { total_likes: 1, total_unlikes: -1 };
      dPayloadEpisode.$inc = { total_likes: 1, total_unlikes: -1 };
      dPayloadCityMovieLike.$inc = {
        total_users_likes: 1,
        total_users_unlikes: -1,
      };
      dPayloadCityMovieGenreLike.$inc = {
        total_genre_likes: 1,
        total_genre_unlikes: -1,
      };

      // user movie like stats update for demographic genre,
      for (const everyGenre of arrayGenres) {
        qUserGenreStat[`${everyGenre.replaceAll("-", "_")}`] = 1;
      }
    }

    // ==========================================
    // KONDISI 6: USER SWAP/PINDAH PILIHAN DARI 'LIKE' KE 'DISLIKE'
    // Ada kemungkinan typo bawaan di '!dMovieLikeBefore', namun komentar disesuaikan alur logika kodenya
    // ==========================================
    if (
      dMovieLikeAfter.status_like == "dislike" &&
      !dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "like"
    ) {
      // console.log(
      //   "KONDISI 6: USER SWAP/PINDAH PILIHAN DARI 'LIKE' KE 'DISLIKE'",
      // );
      // dPayloadMovie.$inc = { total_unlikes: 1,total_likes:-1 };
      dPayloadEpisode.$inc = { total_unlikes: 1, total_likes: -1 };
      dPayloadCityMovieLike.$inc = {
        total_users_likes: -1,
        total_users_unlikes: 1,
      };
      dPayloadCityMovieGenreLike.$inc = {
        total_genre_likes: -1,
        total_genre_unlikes: 1,
      };

      // user movie like stats update for demographic genre,
      for (const everyGenre of arrayGenres) {
        qUserGenreStat[`${everyGenre.replaceAll("-", "_")}`] = -1;
      }
    }

    // for logic series movie, coming
    if (dMovie.type == "series") {
      await EpisodeModel.findOneAndUpdate(
        { _id: payload.episode_id },
        dPayloadEpisode,
        { session },
      );
      await EpisodeLikeModel.findOneAndUpdate(
        { _id: payload.episode_id, user_id: payload.guest_id },
        payload,
        { upsert: true, returnDocument: "after", session },
      );
    }

    // update user movie like stats for demographic genre
    if (req.login) {
      await UserMovieActivityModel.findOneAndUpdate(
        { user_id: payload.guest_id },
        { $inc: qUserGenreStat },
        { session },
      );

      // next step update at REDIS for real time update user movie like stats for demographic genre
    }

    await MovieModel.findOneAndUpdate(
      { _id: payload.movie_id },
      dPayloadMovie,
      { session },
    );

    await UserMovieLikeModel.findOneAndUpdate(
      { user_id: payload.guest_id, movie_id: payload.movie_id },
      payload,
      { upsert: true, returnDocument: "after", session },
    );

    for (const everyGenre of dMovie.genres) {
      await CityStatMovieGenreModel.findOneAndUpdate(
        {
          date_format,
          genre_id: everyGenre,
          city: payload.location_raw.city || "Unknown",
          continent: payload.location_raw.continent,
          country: payload.location_raw.country,
          regionName: payload.location_raw.regionName,
        },
        dPayloadCityMovieGenreLike,
        { upsert: true, returnDocument: "after", session },
      );
    }

    dPayloadCityMovieLike.movie_id = payload.movie_id;
    dPayloadCityMovieLike.movie_name = dMovie.title;
    await CityStatMovieLikeModel.findOneAndUpdate(
      {
        date_format,
        movie_id: payload.movie_id,
        city: payload.location_raw.city || "Unknown",
        continent: payload.location_raw.continent,
        country: payload.location_raw.country,
        regionName: payload.location_raw.regionName,
      },
      dPayloadCityMovieLike,
      { upsert: true, returnDocument: "after", session },
    );

    const updatePayload = {};
    for (const [genreName, incrementValue] of Object.entries(qUserGenreStat)) {
      // Format menjadi: "genre_like_stats.action" : 1
      updatePayload[`genre_like_stats.${genreName}`] = incrementValue;
    }
    const userActivity = await UserMovieActivityModel.findOneAndUpdate(
      { user_id: payload.guest_id },
      { $inc: updatePayload },
      { upsert: true, returnDocument: "after", session },
    );

    if (dMovie.type === "series") {
      // cek episode like
      const dEpisodeLikeAfter = await EpisodeLikeModel.findOneAndUpdate(
        { user_id: payload.guest_id, movie_id: payload.movie_id },
        payload,
        { upsert: true, returnDocument: "after", session },
      );

      await CityStatEpisodeLikeModel.findOneAndUpdate(
        {
          date_format,
          movie_id: payload.movie_id,
          episode_id: payload.episode_id,
          city: payload.location_raw.city || "Unknown",
          continent: payload.location_raw.continent,
          country: payload.location_raw.country,
          regionName: payload.location_raw.regionName,
        },
        dPayloadCityMovieLike,
        { upsert: true, returnDocument: "after", session },
      );
    }

    setCache({
      key: payload.guest_id?.toString(),
      data: {
        genre_watch_stats: userActivity.genre_watch_stats,
        genre_like_stats: userActivity.genre_like_stats,
      },
    });

    // update city stat movie like
    await LogActionModel.create(logActions, { session });

    // update socket for real time update movie like and demographic genre like stats, coming soon

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: "Data has been processed successfully!",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.userMovieWatchHistory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const dLogActions = [];
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'user watch movie'
    #swagger.description = 'user watch movie'
     #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyUserWatchMovieSchema' }
    }
  */
  try {
    const payload = req.body;
    const now = DateTime.now();
    const date_format = now.startOf("day").toFormat("yyyy/LL/dd");

    if (req.login) {
      payload.guest_id = req.login.user_id;
      payload.user_id = req.login.user_id;
      payload.is_guest = false;
    }
    if (payload.guest_id && !req.login) {
      payload.user_id = payload.guest_id;
      payload.guest_id = payload.guest_id;
      payload.is_guest = true;
    }

    const dMovie = await MovieModel.findOne({
      _id: payload.movie_id,
    })
      .populate({ path: "genres", model: "Genre", select: "_id name" })
      .select("_id title is_series type genres_name genres")
      .lean();

    if (!dMovie)
      return res.status(404).json({
        success: false,
        message: "Movie not found!",
        data: null,
      });

    const arrayGenres = dMovie.genres_name
      .split(", ")
      .map((item) => item.replaceAll(" ", "-").toLowerCase().trim());

    const query = {
      user_id: payload.guest_id,
      movie_id: payload.movie_id,
    };

    const dMovieHistoryExist = await WatchHistoryModel.findOne(query).lean();

    if (dMovieHistoryExist && dMovieHistoryExist.is_completed) {
      return res.status(200).json({
        success: true,
        message: "Data has been processed successfully!",
        data: true,
      });
    }

    const dMovieHistoryUpdate = await WatchHistoryModel.findOneAndUpdate(
      query,
      payload,
      { upsert: true, returnDocument: "after", session },
    );

    if (payload.progress_seconds === dMovieHistoryExist?.duration_seconds)
      payload.is_completed = true;

    /* untuk saat ini logiknya counting watch movie di collection WatchHistory dan Movie
     akan bertambah ketika user pertama kali menonton
    */
    if (dMovieHistoryExist) {
      dLogActions.push({
        type: "UPDATE",
        target_id: payload.guest_id, // id of the updated document
        before: dMovieHistoryExist,
        after: dMovieHistoryUpdate,
        source: WatchHistoryModel.collection.collectionName,
      });
    } else {
      dLogActions.push({
        type: "CREATE",
        target_id: payload.guest_id, // id of the created document
        after: payload,
        source: WatchHistoryModel.collection.collectionName,
      });

      await CityStatMovieWatchModel.findOneAndUpdate(
        {
          date_format,
          movie_id: payload.movie_id,
          city: payload.location_raw.city || "Unknown",
          continent: payload.location_raw.continent,
          country: payload.location_raw.country,
          regionName: payload.location_raw.regionName,
        },
        {
          $inc: { total_users_watch: 1 },
          ...payload.location_raw,
          ...payload,
        },
        { upsert: true, returnDocument: "after", session },
      );
      if (dMovie.type == "series") {
        await CityStatEpisodeWatchModel.findOneAndUpdate(
          {
            date_format,
            movie_id: payload.movie_id,
            city: payload.location_raw.city || "Unknown",
            continent: payload.location_raw.continent,
            country: payload.location_raw.country,
            regionName: payload.location_raw.regionName,
            episode_id: payload.episode_id || null,
          },
          {
            $inc: { total_users_watches: 1 },
            ...payload.location_raw,
            ...payload,
          },
          { upsert: true, returnDocument: "after", session },
        );
      }
      await MovieModel.findOneAndUpdate(
        { _id: payload.movie_id },
        { $inc: { total_watch: 1 } },
        { upsert: true, returnDocument: "after", session },
      );
    }

    // update user activity for demographic genre watch stats
    const updatePayload = {};
    for (const everyGenre of arrayGenres) {
      // Format menjadi: "genre_like_stats.action" : 1
      updatePayload[
        `genre_watch_stats.${everyGenre.toLowerCase().replaceAll(" ", "_")}`
      ] = 1;
    }
    const userActivity = await UserMovieActivityModel.findOneAndUpdate(
      { user_id: payload.guest_id },
      { $inc: updatePayload },
      { upsert: true, returnDocument: "after", session },
    );

    setCache({
      key: payload.guest_id?.toString(),
      data: {
        genre_watch_stats: userActivity.genre_watch_stats,
        genre_like_stats: userActivity.genre_like_stats,
      },
    });

    await session.commitTransaction();
    // update socket for real time update movie like and demographic genre like stats, coming soon
    res.status(200).json({
      success: true,
      message: "Data has been processed successfully!",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.userMovieRating = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'user rating movie'
    #swagger.description = 'user rating movie'
     #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyUserRatingMovieSchema' }
    }
  */
  try {
    const payload = req.body;
    const userId = req.login ? req.login._id : payload.guest_id;
    const movieId = payload.movie_id;

    // 1. Validasi keberadaan Movie
    const movieExists = await MovieModel.findById(movieId).session(session);
    if (!movieExists) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Movie not found!" });
    }

    // 2. Simpan atau Update Rating User (0-5)
    await UserMovieRatingModel.findOneAndUpdate(
      { user_id: userId, movie_id: movieId },
      {
        ...payload,
        user_id: userId,
        rating: payload.rating, // Tetap simpan skala 0-5 sesuai Schema
      },
      { upsert: true, returnDocument: "after", session },
    );

    // 3. HITUNG ULANG RATA-RATA (AGREGASI)
    // Kita hitung semua rating yang masuk untuk movie ini
    const stats = await UserMovieRatingModel.aggregate([
      { $match: { movie_id: new mongoose.Types.ObjectId(movieId) } },
      {
        $group: {
          _id: "$movie_id",
          averageRating: { $avg: "$rating" }, // Rata-rata skala 0-5
          totalVotes: { $sum: 1 },
        },
      },
    ]).session(session);

    if (stats.length > 0) {
      const { averageRating, totalVotes } = stats[0];
      //  Hitung skala 10 dengan tetap mempertahankan desimal
      const ratingTenScale = parseFloat((averageRating * 2).toFixed(1));

      // 4. Update ke Model Movie
      // Kita simpan rata-rata (0-5) dan jika butuh skala 0-10 bisa dikali 2 di sini
      await MovieModel.findByIdAndUpdate(
        movieId,
        {
          $set: {
            vote_rating: totalVotes, // Simpan rata-rata asli di database
            rating_display: ratingTenScale, // Skala 0-10 untuk tampilan
          },
        },
        { session },
      );
    }

    await CityStatMovieRatingModel.findOneAndUpdate(
      {
        movie_id: payload.movie_id,
        city: payload.location_raw.city || "Unknown",
        continent: payload.location_raw.continent,
        country: payload.location_raw.country,
        regionName: payload.location_raw.regionName,
      },
      {
        total_user_rating: totalVotes,
        total_avg_rating: ratingTenScale, // Simpan rata-rata asli di database
        ...payload.location_raw,
        ...payload,
      },
      { upsert: true, returnDocument: "after", session },
    );

    if (payload.episode_id) {
      // Simpan atau Update Rating untuk Episode jika episode_id ada
      await EpisodeRatingModel.findOneAndUpdate(
        { user_id: userId, episode_id: payload.episode_id },
        { ...payload, user_id: userId },
        { upsert: true, returnDocument: "after", session },
      );
    }

    await session.commitTransaction();
    // update socket for real time update movie like and demographic genre like stats, coming soon
    res
      .status(200)
      .json({ success: true, message: "Rating updated successfully" });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

// DEMOGRAPHIC ANALYTIC USER MOVIE LIKE, WATCH, RATING, GENRE PREFERENCE
controller.getAllDemographicLike = async (req, res, next) => {
  /*
    #swagger.tags = ['DEMOGRAPHIC ANALYTIC']
    #swagger.summary = 'get data user movie like for demographic analytic'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      {
        path: "movie_id",
        model: "Movie",
        select: "_id title cover_id",
        populate: { path: "cover_id", select: "_id path" },
      },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await CityStatMovieLikeModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatMovieLikeModel,
      {
        query,
        populateField,
        skip,
        limit,
        selectField: "-location_raw -__v -created_at",
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getAllDemographicGenre = async (req, res, next) => {
  /*
    #swagger.tags = ['DEMOGRAPHIC ANALYTIC']
    #swagger.summary = 'get data user movie genre for demographic analytic'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [{ path: "genre_id", select: "_id name" }];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await CityStatMovieGenreModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatMovieGenreModel,
      {
        query,
        populateField,
        skip,
        limit,
        selectField: "-location_raw -__v -created_at",
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getAllDemographicWatch = async (req, res, next) => {
  /*
    #swagger.tags = ['DEMOGRAPHIC ANALYTIC']
    #swagger.summary = 'get data user movie watch for demographic analytic'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select: "_id name cover_id",
        populate: { path: "cover_id", select: "path" },
      },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await CityStatMovieWatchModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatMovieWatchModel,
      {
        query,
        populateField,
        skip,
        limit,
        selectField: "-location_raw -__v -created_at",
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getAllDemographicRating = async (req, res, next) => {
  /*
    #swagger.tags = ['DEMOGRAPHIC ANALYTIC']
    #swagger.summary = 'get data user movie rating for demographic analytic'
    #swagger.description = 'get user transaction'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select: "_id name cover_id",
        populate: { path: "cover_id", select: "path" },
      },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await CityStatMovieRatingModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatMovieRatingModel,
      {
        query,
        populateField,
        skip,
        limit,
        selectField: "-location_raw -__v -created_at",
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
