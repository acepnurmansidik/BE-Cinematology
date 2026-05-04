const { default: mongoose } = require("mongoose");
const crudServices = require("../../helper/crudService");
const PaymentHistoryModel = require("../models/PaymentHistory.model");
const SubscriptionModel = require("../models/Subscription.model");
const WatchHistoryModel = require("../models/WatchHistory.model");
const PlanModel = require("../models/Plan.model");
const LogActionModel = require("../models/LogAction.model");
const MovieModel = require("../models/Movie.model");
const UserMovieLikeModel = require("../models/UserMovieLike.model");
const EpisodeLikeModel = require("../models/EpisodeLike.model");
const CityStatMovieLikeModel = require("../models/CityStatMovieLike.model");
const CityStatMovieWatchModel = require("../models/CityStatMovieWatch.model");
const UserMovieRatingModel = require("../models/UserMovieRating.model");
const EpisodeRatingModel = require("../models/EpisodeRating.model");
const CityStatMovieRatingModel = require("../models/CityStatMovieRating.model");

const controller = {};

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
      arrFilter.push({ value: { $regex: search, $options: "i" } });
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
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [];
    query.user_id = req.login._id;
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await WatchHistoryModel.countDocuments(query);
    const result = await crudServices.findAllPagination(WatchHistoryModel, {
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
    if (req.login) payload.guest_id = req.login._id;
    let dEpisodeLike, dMovieLikeModel;
    const dMovie = await MovieModel.findOne({ _id: payload.movie_id })
      .select("_id name is_series type")
      .lean();

    const dMovieLikeBefore = await UserMovieLikeModel.findOne({
      user_id: payload.guest_id,
      movie_id: payload.movie_id,
    }).lean();

    if (!dMovie)
      return res
        .status(404)
        .json({ success: false, message: "Movie not found!", data: null });

    if (dMovie.type === "series") {
      // cek episode like
      const dEpisodeLikeAfter = await EpisodeLikeModel.findOneAndUpdate(
        { user_id: payload.guest_id, movie_id: payload.movie_id },
        payload,
        { upsert: true, returnDocument: "after", session },
      );
    }

    // cek userMovie like
    const dMovieLikeAfter = await UserMovieLikeModel.findOneAndUpdate(
      { user_id: payload.guest_id, movie_id: payload.movie_id },
      payload,
      { upsert: true, returnDocument: "after", session },
    );

    const dPayloadMovie = {};
    const dPayloadEpisode = {};
    const dPayloadCityMovieLike = {
      location_raw: payload.location_raw,
      ...payload.location_raw,
    };
    // logika penentuan increment dan decrement total like dan unlike
    if (dMovieLikeAfter.status_like == "like" && !dMovieLikeBefore) {
      dPayloadMovie.$inc = { total_likes: 1 };
      dPayloadEpisode.$inc = { total_likes: 1 };
      dPayloadCityMovieLike.$inc = { total_users_likes: 1 };
    }
    if (dMovieLikeAfter.status_like == "dislike" && !dMovieLikeBefore) {
      dPayloadMovie.$inc = { total_unlikes: 1 };
      dPayloadEpisode.$inc = { total_unlikes: 1 };
      dPayloadCityMovieLike.$inc = { total_users_unlikes: 1 };
    }
    if (
      dMovieLikeAfter.status_like == "none" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "like"
    ) {
      // dPayloadMovie.$inc = { total_likes: -1 };
      dPayloadEpisode.$inc = { total_likes: -1 };
      dPayloadCityMovieLike.$inc = { total_users_likes: -1 };
    }
    if (
      dMovieLikeAfter.status_like == "none" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "dislike"
    ) {
      // dPayloadMovie.$inc = { total_unlikes: -1 };
      dPayloadEpisode.$inc = { total_unlikes: -1 };
      dPayloadCityMovieLike.$inc = { total_users_unlikes: -1 };
    }
    if (
      dMovieLikeAfter.status_like == "like" &&
      dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "dislike"
    ) {
      // dPayloadMovie.$inc = { total_likes: 1, total_unlikes: -1 };
      dPayloadEpisode.$inc = { total_likes: 1, total_unlikes: -1 };
      dPayloadCityMovieLike.$inc = {
        total_users_likes: 1,
        total_users_unlikes: -1,
      };
    }
    if (
      dMovieLikeAfter.status_like == "dislike" &&
      !dMovieLikeBefore &&
      dMovieLikeBefore.status_like == "like"
    ) {
      // dPayloadMovie.$inc = { total_unlikes: 1,total_likes:-1 };
      dPayloadEpisode.$inc = { total_unlikes: 1, total_likes: -1 };
      dPayloadCityMovieLike.$inc = {
        total_users_likes: -1,
        total_users_unlikes: 1,
      };
    }

    // for logic series movie, coming
    if (dMovie.type == "series") {
      await MovieEpisodeModel.findOneAndUpdate(
        { _id: payload.episode_id },
        dPayloadEpisode,
        { session },
      );
      await EpisodeLikeModel.findOneAndUpdate(
        { _id: payload.episode_id, user_id: payload.guest_id },
        payload,
        { session, upsert: true },
      );
    }

    await MovieModel.findOneAndUpdate(
      { _id: payload.movie_id },
      dPayloadMovie,
      { session },
    );

    await UserMovieLikeModel.findOneAndUpdate(
      { user_id: payload.guest_id, movie_id: payload.movie_id },
      payload,
      { session, upsert: true },
    );

    await CityStatMovieLikeModel.findOneAndUpdate(
      {
        movie_id: payload.movie_id,
        city: payload.location_raw.city || "Unknown",
        continent: payload.location_raw.continent,
        country: payload.location_raw.country,
        regionName: payload.location_raw.regionName,
      },
      dPayloadCityMovieLike,
      { upsert: true, returnDocument: "after", session },
    );

    // update city stat movie like
    await LogActionModel.create(logActions, { session });

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
    if (req.login) payload.guest_id = req.login._id;

    const query = {
      user_id: payload.guest_id,
      movie_id: payload.movie_id,
    };
    if (payload.episode_id) query.episode_id = payload.episode_id;

    const dMovieHistoryExist = await WatchHistoryModel.findOne(query).lean();

    if (dMovieHistoryExist && dMovieHistoryExist.is_completed) {
      return res.status(200).json({
        success: true,
        message: "Data has been processed successfully!",
        data: true,
      });
    }

    if (payload.progress_seconds === dMovieHistoryExist?.duration_seconds) {
      payload.is_completed = true;
      await CityStatMovieWatchModel.findOneAndUpdate(
        {
          movie_id: payload.movie_id,
          city: payload.location_raw.city || "Unknown",
          continent: payload.location_raw.continent,
          country: payload.location_raw.country,
          regionName: payload.location_raw.regionName,
        },
        { status: "completed" },
        { session },
      );
    }
    const dMovieHistoryUpdate = await WatchHistoryModel.findOneAndUpdate(
      query,
      payload,
      {
        upsert: true,
        returnDocument: "after",
        session,
      },
    );

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
        { session },
      );
      await MovieModel.findOneAndUpdate(
        { _id: payload.movie_id },
        { $inc: { total_watch: 1 } },
        { session },
      );
    }

    await session.commitTransaction();
    // logic for user movie watch history, coming soon
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
      { upsert: true, session },
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
      { session, upsert: true },
    );

    if (payload.episode_id) {
      // Simpan atau Update Rating untuk Episode jika episode_id ada
      await EpisodeRatingModel.findOneAndUpdate(
        { user_id: userId, episode_id: payload.episode_id },
        { ...payload, user_id: userId },
        { session, upsert: true },
      );
    }

    await session.commitTransaction();
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

module.exports = controller;
