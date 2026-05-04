const { messaging } = require("firebase-admin");
const { default: mongoose } = require("mongoose");
const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const MovieModel = require("../models/Movie.model");
const GenreModel = require("../models/Genre.model");
const ActorModel = require("../models/Actor.model");
const StudioModel = require("../models/Studio.model");
const CityStatGenreUserModel = require("../models/CityStatGenreUser.model");
const CityStatMovieLikeModel = require("../models/CityStatMovieLike.model");
const LogActionModel = require("../models/LogAction.model");
const CityStatMovieWatchModel = require("../models/CityStatMovieWatch.model");
const CityStatMovieRatingModel = require("../models/CityStatMovieRating.model");

const controller = {};

controller.getAllMovieAdminOnly = async (req, res, next) => {
  /* 
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'get all movies'
    #swagger.description = 'get all movies with pagination, search, and filter by type'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [
      { path: "thumbnail_id", model: "Image", select: "_id source_name" },
      { path: "cover_id", model: "Image", select: "_id source_name" },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await MovieModel.countDocuments(query);
    const result = await crudServices.findAllPagination(MovieModel, {
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

controller.createMovieAdminOnly = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const dLogActions = [];
  /*
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'Create Movie'
    #swagger.description = 'Create a new movie'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create movie',
      schema: { $ref: '#/definitions/BodyMovieSchema' }
    }
  */
  try {
    const payload = req.body;
    payload.slug = globalService.createSlug(payload.title);

    const isMovieExist = await MovieModel.findOne({
      slug: payload.slug,
    }).lean();
    if (isMovieExist)
      return res.status(400).json({
        success: false,
        messaging: `Movie with name "${payload.title}" already exist!`,
        data: null,
      });

    for (const genre of payload.genres) {
      if (!genre.is_new) return;
      const genreSlug = globalService.createSlug(genre.name);
      await GenreModel.findOneAndUpdate(
        { slug: genreSlug },
        { name: genre.name, slug: genreSlug },
        { upsert: true, session },
      );
    }

    for (const actor of payloa.actors) {
      if (!actor.is_new) return;
      const actorSlug = globalService.createSlug(actor.name);
      await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: actor.name, slug: actorSlug },
        { upsert: true, session },
      );
    }

    for (const studio of payload.studios) {
      if (!studio.is_new) return;
      const actorSlug = globalService.createSlug(studio.name);
      await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: studio.name, slug: actorSlug },
        { upsert: true, session },
      );
    }

    const result = await MovieModel.create([payload], { session });
    dLogActions.push({
      type: "CREATE",
      target_id: result._id, // id of the created document
      before: null,
      after: result,
      source: MovieModel.collection.collectionName,
    });

    await LogActionModel.create(dLogActions, { session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      messaging: "Movie created successfully!",
      data: result,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.updateMovieAdminOnly = async (req, res, next) => {
  const session = await mongoose.startSession;
  session.startTransaction();
  const logActions = [];
  /*
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'Update Movie'
    #swagger.description = 'Update an existing movie'
    #swagger.parameters['id'] = { description: 'id movie' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update movie',
      schema: { $ref: '#/definitions/BodyMovieSchema' }
    }
  */
  try {
    const id = req.params.id;
    const payload = req.body;
    payload.slug = globalService.createSlug(payload.title);

    const isMovieExist = await MovieModel.findOne({ _id: id }).lean();

    if (!isMovieExist)
      return res.status(404).json({
        success: false,
        messaging: `Movie with name "${payload.title}" not found!`,
        data: null,
      });

    const result = await crudServices.update(MovieModel, { id, data: payload });
    const movieUpdate = await MovieModel.findOneAndUpdate(
      { _id: id },
      payload,
      {
        session,
      },
    );

    await CityStatMovieLikeModel.findOneAndUpdate(
      { movie_id: id },
      { movie_name: payload.title },
      { session },
    );

    await CityStatMovieWatchModel.findOneAndUpdate(
      { movie_id: id },
      { movie_name: payload.title },
      { session },
    );

    await CityStatGenreUserModel.findOneAndUpdate(
      { movie_id: id },
      { movie_name: payload.title },
      { session },
    );

    for (const genre of payload.genres) {
      if (!genre.is_new) return;
      const genreSlug = globalService.createSlug(genre.name);
      await GenreModel.findOneAndUpdate(
        { slug: genreSlug },
        { name: genre.name, slug: genreSlug },
        { upsert: true, session },
      );
    }

    for (const actor of payloa.actors) {
      if (!actor.is_new) return;
      const actorSlug = globalService.createSlug(actor.name);
      await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: actor.name, slug: actorSlug },
        { upsert: true, session },
      );
    }

    for (const studio of payload.studios) {
      if (!studio.is_new) return;
      const actorSlug = globalService.createSlug(studio.name);
      await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: studio.name, slug: actorSlug },
        { upsert: true, session },
      );
    }

    logActions.push({
      type: "UPDATE",
      target_id: isMovieExist._id, // id of the created document
      before: isMovieExist,
      after: movieUpdate,
      source: MovieModel.collection.collectionName,
    });

    await LogActionModel.create(logActions, { session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      messaging: "Movie updated successfully!",
      data: result,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.deleteMovieAdminOnly = async (req, res, next) => {
  /*
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'Delete Movie'
    #swagger.description = 'Delete an existing movie'
    #swagger.parameters['id'] = { description: 'id movie' }
  */
  try {
    const id = req.params.id;
    const payload = req.body;
    payload.slug = globalService.createSlug(payload.title);

    const isMovieExist = await MovieModel.findOne({ _id: id }).lean();

    if (!isMovieExist)
      return res
        .status(404)
        .json({ success: false, messaging: "Movie not found!", data: null });

    const result = await crudServices.delete(MovieModel, { id, data: payload });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

controller.getUserDemographicMovieLike = async (req, res, next) => {
  /* 
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'get all movies for demographic like'
    #swagger.description = 'get all movies with pagination, search, and filter by type'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    if (req.query.continent) query.continent = req.query.continent;
    if (req.query.country) query.country = req.query.country;
    if (req.query.region) query.region = req.query.region;
    if (req.query.city) query.city = req.query.city;
    const populateField = [];
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
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getUserDemographicMovieWatch = async (req, res, next) => {
  /* 
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'get all movies for demographic watch'
    #swagger.description = 'get all movies with pagination, search, and filter by type'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    if (req.query.continent) query.continent = req.query.continent;
    if (req.query.country) query.country = req.query.country;
    if (req.query.region) query.region = req.query.region;
    if (req.query.city) query.city = req.query.city;
    if (req.query.status) query.status = req.query.status;
    const populateField = [];
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
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getDemographicMovieGenreUser = async (req, res, next) => {
  /* 
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'get all movies for demographic genre user'
    #swagger.description = 'get all movies with pagination, search, and filter by type'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    if (req.query.continent) query.continent = req.query.continent;
    if (req.query.country) query.country = req.query.country;
    if (req.query.region) query.region = req.query.region;
    if (req.query.city) query.city = req.query.city;
    const populateField = [];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ value: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await CityStatGenreUserModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatGenreUserModel,
      {
        query,
        populateField,
        skip,
        limit,
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.getDemographicMovieUserRating = async (req, res, next) => {
  /* 
    #swagger.tags = ['MOVIE']
    #swagger.summary = 'get all movies for demographic rating movie with user'
    #swagger.description = 'get all movies with pagination, search, and filter by type'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    if (req.query.continent) query.continent = req.query.continent;
    if (req.query.country) query.country = req.query.country;
    if (req.query.region) query.region = req.query.region;
    if (req.query.city) query.city = req.query.city;
    const populateField = [];
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
      },
    );
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
