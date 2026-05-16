const { messaging } = require("firebase-admin");
const { default: mongoose } = require("mongoose");
const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const MovieModel = require("../models/Movie.model");
const GenreModel = require("../models/Genre.model");
const ActorModel = require("../models/Actor.model");
const AuthorModel = require("../models/Author.model");
const StudioModel = require("../models/Studio.model");
const CityStatMovieGenreModel = require("../models/CityStatMovieGenre.model");
const CityStatMovieLikeModel = require("../models/CityStatMovieLike.model");
const LogActionModel = require("../models/LogAction.model");
const CityStatMovieWatchModel = require("../models/CityStatMovieWatch.model");
const CityStatMovieRatingModel = require("../models/CityStatMovieRating.model");

const controller = {};

// CRUD MOVIE
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
      { path: "genres", model: "Genre", select: "_id name is_new" },
      { path: "studios", model: "Studio", select: "_id name is_new" },
      { path: "authors", model: "Author", select: "_id name is_new" },
      { path: "actors", model: "Actor", select: "_id name is_new" },
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
    if (payload.type) payload.type = payload.type.toLowerCase();

    // --- PROSES GENRES ---
    const finalGenres = [];
    for (let index = 0; index < payload.genres.length; index++) {
      const item = payload.genres[index];
      if (!item.is_new) {
        finalGenres.push(item._id);
        continue;
      }
      const genreSlug = globalService.createSlug(item.name);
      const result = await GenreModel.findOneAndUpdate(
        { slug: genreSlug },
        { name: item.name, slug: genreSlug },
        { upsert: true, returnDocument: "after", session }, // Menggunakan standard baru Mongoose
      );
      finalGenres.push(result._id);
    }

    // --- PROSES ACTORS ---
    const finalActors = [];
    for (let index = 0; index < payload.actors.length; index++) {
      const item = payload.actors[index];
      if (!item.is_new) {
        finalActors.push(item._id);
        continue;
      }
      const actorSlug = globalService.createSlug(item.name);
      const result = await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: item.name, slug: actorSlug },
        { upsert: true, returnDocument: "after", session },
      );
      finalActors.push(result._id);
    }

    // --- PROSES STUDIOS ---
    const finalStudios = [];
    for (let index = 0; index < payload.studios.length; index++) {
      const item = payload.studios[index];
      if (!item.is_new) {
        finalStudios.push(item._id);
        continue;
      }
      const studioSlug = globalService.createSlug(item.name);
      const result = await StudioModel.findOneAndUpdate(
        { slug: studioSlug },
        { name: item.name, slug: studioSlug },
        { upsert: true, returnDocument: "after", session },
      );
      finalStudios.push(result._id);
    }

    // --- PROSES AUTHORS ---
    const finalAuthors = [];
    if (payload.authors && payload.authors.length > 0) {
      for (let index = 0; index < payload.authors.length; index++) {
        const item = payload.authors[index];
        if (!item.is_new) {
          finalAuthors.push(item._id);
          continue;
        }
        const authorSlug = globalService.createSlug(item.name);
        const result = await AuthorModel.findOneAndUpdate(
          { slug: authorSlug },
          { name: item.name, slug: authorSlug },
          { upsert: true, returnDocument: "after", session },
        );
        finalAuthors.push(result._id);
      }
    }

    payload.genres = finalGenres;
    payload.actors = finalActors;
    payload.studios = finalStudios;
    payload.authors = finalAuthors;

    // PERBAIKAN: Bersihkan opsi .create() dari upsert karena create otomatis insert baru
    const createdMovies = await MovieModel.create([payload], { session });

    dLogActions.push({
      type: "CREATE",
      target_id: createdMovies[0]._id,
      before: null,
      after: createdMovies[0],
      source: MovieModel.collection.collectionName,
    });

    await LogActionModel.create(dLogActions, { session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      messaging: "Movie created successfully!",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message);
  } finally {
    await session.endSession();
  }
};

controller.updateMovieAdminOnly = async (req, res, next) => {
  const session = await mongoose.startSession();
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
    const _id = req.params.id;
    const payload = req.body;
    payload.slug = globalService.createSlug(payload.title);

    const isMovieExist = await MovieModel.findOne({ _id }).lean();

    if (!isMovieExist)
      return res.status(404).json({
        success: false,
        messaging: `Movie with name "${payload.title}" not found!`,
        data: null,
      });

    // --- PROSES GENRES ---
    const finalGenres = [];
    for (let index = 0; index < payload.genres.length; index++) {
      const item = payload.genres[index];
      if (!item.is_new) {
        finalGenres.push(item._id); // Hanya simpan ID-nya saja
        continue; // Ganti return menjadi continue agar loop tidak mati
      }
      const genreSlug = globalService.createSlug(item.name);
      const result = await GenreModel.findOneAndUpdate(
        { slug: genreSlug },
        { name: item.name, slug: genreSlug },
        { upsert: true, returnDocument: "after", session },
      );
      finalGenres.push(result._id);
    }

    // --- PROSES ACTORS ---
    const finalActors = [];
    for (let index = 0; index < payload.actors.length; index++) {
      const item = payload.actors[index];
      if (!item.is_new) {
        finalActors.push(item._id);
        continue;
      }
      const actorSlug = globalService.createSlug(item.name);
      const result = await ActorModel.findOneAndUpdate(
        { slug: actorSlug },
        { name: item.name, slug: actorSlug },
        { upsert: true, returnDocument: "after", session },
      );
      finalActors.push(result._id);
    }

    // --- PROSES STUDIOS ---
    const finalStudios = [];
    for (let index = 0; index < payload.studios.length; index++) {
      const item = payload.studios[index];
      if (!item.is_new) {
        finalStudios.push(item._id);
        continue;
      }
      const studioSlug = globalService.createSlug(item.name);
      const result = await StudioModel.findOneAndUpdate(
        { slug: studioSlug },
        { name: item.name, slug: studioSlug },
        { upsert: true, returnDocument: "after", session },
      );
      finalStudios.push(result._id);
    }

    // --- PROSES AUTHORS (Tambahan karena ada di log error Anda) ---
    const finalAuthors = [];
    if (payload.authors && payload.authors.length > 0) {
      for (let index = 0; index < payload.authors.length; index++) {
        const item = payload.authors[index];
        if (!item.is_new) {
          finalAuthors.push(item._id);
          continue;
        }
        const authorSlug = globalService.createSlug(item.name);
        // Ganti AuthorModel dengan nama model Author Anda yang sebenarnya jika berbeda
        const result = await AuthorModel.findOneAndUpdate(
          { slug: authorSlug },
          { name: item.name, slug: authorSlug },
          { upsert: true, returnDocument: "after", session },
        );
        finalAuthors.push(result._id);
      }
    }

    payload.genres = finalGenres;
    payload.actors = finalActors;
    payload.studios = finalStudios;
    payload.authors = finalAuthors;

    const movieUpdate = await MovieModel.findOneAndUpdate(
      { _id },
      { ...payload, is_delete: false },
      { upsert: true, returnDocument: "after", session },
    );

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
      data: null,
    });
  } catch (error) {
    // Hanya lakukan abort jika transaksi belum sempat di-commit
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw new Error(error.message);
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

// GET DATA FOR DEMOGRAPHIC MOVIE
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

    const page_size = await CityStatMovieGenreModel.countDocuments(query);
    const result = await crudServices.findAllPagination(
      CityStatMovieGenreModel,
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
