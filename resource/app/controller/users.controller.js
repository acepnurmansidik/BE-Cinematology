const { default: mongoose } = require("mongoose");
const crudServices = require("../../helper/crudService");
const PaymentHistory = require("../models/paymentHistory.model");
const PlanModel = require("../models/Plan.model");
const MovieModel = require("../models/Movie.model");
const SubscriptionModel = require("../models/Subscription.model");
const UserMovieLikeModel = require("../models/UserMovieLike.model");
const LogActionModel = require("../models/LogAction.model");
const UserModel = require("../models/Users.model");
const CityStatMovieLike = require("../models/CityStatMovieLike.model");
const EpisodeLikeModel = require("../models/EpisodeLike.model");
const MovieEpisodeModel = require("../models/MovieEpisode.model");
const WatchHistoryModel = require("../models/WatchHistory.model");
const CityStatMovieWatchModel = require("../models/CityStatMovieWatch.model");

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
    const populateField = [];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await PaymentHistory.countDocuments(query);
    const result = await crudServices.findAllPagination(PaymentHistory, {
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

    const resultPaymentHistory = await PaymentHistory.create(
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
      source: PaymentHistory.collection.collectionName,
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

    const page_size = await PaymentHistory.countDocuments(query);
    const result = await crudServices.findAllPagination(PaymentHistory, {
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

    const isPaymentHistoryExist = await PaymentHistory.findOne({
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
        PaymentHistory.findOne({ _id: isPaymentHistoryExist._id }).lean(),
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
    const resultPayment = await PaymentHistory.findOneAndUpdate(
      { _id: isPaymentHistoryExist._id },
      { status: "success" },
      { session },
    );

    logActions.push({
      type: "UPDATE",
      target_id: resultPayment._id, // id of the created document
      before: userPaymentBefore,
      after: resultPayment,
      source: PaymentHistory.collection.collectionName,
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
    payload.user_id = req.login._id;
    let dEpisodeLike, dMovieLikeModel;
    const dMovie = await MovieModel.findOne({ _id: payload.movie_id })
      .select("_id name is_series type")
      .lean();

    const dMovieLikeBefore = await UserMovieLikeModel.findOne({
      user_id: req.login._id,
      movie_id: payload.movie_id,
    }).lean();

    if (!dMovie)
      return res
        .status(404)
        .json({ success: false, message: "Movie not found!", data: null });

    if (dMovie.is_series && dMovie.type == "movie") {
      // cek episode like
      const dEpisodeLikeAfter = await EpisodeLikeModel.findOneAndUpdate(
        { user_id: req.login._id, movie_id: payload.movie_id },
        payload,
        { upsert: true, returnDocument: "after", session },
      );
    }

    // cek userMovie like
    const dMovieLikeAfter = await UserMovieLikeModel.findOneAndUpdate(
      { user_id: req.login._id, movie_id: payload.movie_id },
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
        { _id: payload.episode_id, user_id: req.login._id },
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
      { user_id: payload.user_id, movie_id: payload.movie_id },
      payload,
      { session, upsert: true },
    );

    await CityStatMovieLike.findOneAndUpdate(
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
    payload.user_id = req.login._id;
    const query = {
      user_id: payload.user_id,
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
        target_id: req.login._id, // id of the updated document
        before: dMovieHistoryExist,
        after: dMovieHistoryUpdate,
        source: WatchHistoryModel.collection.collectionName,
      });
    } else {
      dLogActions.push({
        type: "CREATE",
        target_id: req.login._id, // id of the created document
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

module.exports = controller;
