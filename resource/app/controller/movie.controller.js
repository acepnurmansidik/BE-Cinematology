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
const CityStatEpisodeWatchModel = require("../models/CityStatEpisodeWatch.model");
const CityStatMovieRatingModel = require("../models/CityStatMovieRating.model");
const { getCache } = require("../../helper/redis-cache");
const { DateTime } = require("luxon");
const EpisodeModel = require("../models/Episode.model");
const CityStatEpisodeLikeModel = require("../models/CityStatEpisodeLike.model");

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
      { path: "thumbnail_id", model: "Image", select: "_id path" },
      { path: "cover_id", model: "Image", select: "_id path" },
      { path: "genres", model: "Genre", select: "_id name is_new" },
      {
        path: "studios",
        model: "Studio",
        select: "_id name is_new profile_id",
        populate: { path: "profile_id", model: "Image", select: "_id path" },
      },
      {
        path: "authors",
        model: "Author",
        select: "_id name is_new avatar_id",
        populate: { path: "avatar_id", model: "Image", select: "_id path" },
      },
      {
        path: "actors",
        model: "Actor",
        select: "_id name is_new avatar_id",
        populate: { path: "avatar_id", model: "Image", select: "_id path" },
      },
    ];
    const { search, type, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    if (query.length) query.type = type;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ title: { $regex: search, $options: "i" } });
      arrFilter.push({ code: { $regex: search, $options: "i" } });
      arrFilter.push({ genres_name: { $regex: search, $options: "i" } });
      arrFilter.push({ authors_name: { $regex: search, $options: "i" } });
      arrFilter.push({ actors_name: { $regex: search, $options: "i" } });
      arrFilter.push({ studio_name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const [page_size, result] = await Promise.all([
      MovieModel.countDocuments(query),
      crudServices.findAllPagination(MovieModel, {
        query,
        populateField,
        skip,
        limit,
      }),
    ]);
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

controller.createMovieAdminOnly = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
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
    const [createdMovies] = await MovieModel.create([payload], { session });

    await LogActionModel.create(
      {
        target_id: createdMovies._id,
        source: MovieModel.collection.collectionName,
        activities: [
          {
            type: "CREATE",
            after: createdMovies,
            before: null,
          },
        ],
      },
      { session },
    );
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      messaging: "Movie created successfully!",
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};

controller.updateMovieAdminOnly = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
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

    const dLogMovie = await LogActionModel.findOne(
      { target_id: _id },
      { session },
    ).lean();

    dLogMovie.activities.push({
      type: "UPDATE",
      before: isMovieExist,
      after: movieUpdate,
    });

    await dLogMovie.save({ session });
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

    const [page_size, result] = await Promise.all([
      CityStatMovieLikeModel.countDocuments(query),
      crudServices.findAllPagination(CityStatMovieLikeModel, {
        query,
        populateField,
        skip,
        limit,
      }),
    ]);
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

    const [page_size, result] = await Promise.all([
      CityStatMovieWatchModel.countDocuments(query),
      crudServices.findAllPagination(CityStatMovieWatchModel, {
        query,
        populateField,
        skip,
        limit,
      }),
    ]);
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

    const [page_size, result] = await Promise.all([
      CityStatMovieGenreModel.countDocuments(query),
      crudServices.findAllPagination(CityStatMovieGenreModel, {
        query,
        populateField,
        skip,
        limit,
      }),
    ]);
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

    const [page_size, result] = await Promise.all([
      CityStatMovieRatingModel.countDocuments(query),
      crudServices.findAllPagination(CityStatMovieRatingModel, {
        query,
        populateField,
        skip,
        limit,
      }),
    ]);
    res.status(200).json({ ...result, page_size, current_page: Number(page) });
  } catch (err) {
    next(err);
  }
};

// GET MOVIE RECOMMENDATION
controller.getMovieRecommendation = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get movie recommendation'
    #swagger.description = 'Retrieve movie recommendations based on user's personal like history, regional preferences, and top genres in their city.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['user_region'] = { default: 'Jakarta', description: 'user_region' }
    #swagger.parameters['user_city'] = { default: 'North Jakarta', description: 'user_city' }
  */

  try {
    const userId = req.login?.user_id.toString();
    const { limit = 10, user_region, user_city } = req.query;
    let recommendedMovies = [];

    // ==========================================
    // STRATEGI 1: REKOMENDASI BERDASARKAN CACHE USER
    // ==========================================
    const userExistOnCache = await getCache(userId);
    if (
      userExistOnCache?.genre_like_stats &&
      Object.keys(userExistOnCache.genre_like_stats).length &&
      userId
    ) {
      const targetGenres = Object.keys(userExistOnCache.genre_like_stats);

      // ==========================================
      // STRATEGI 1: REKOMENDASI BERDASARKAN LIKES USER
      // ==========================================
      const recommendScore = [];
      for (const genre of targetGenres) {
        const weight = userExistOnCache.genre_like_stats[genre] || 0;
        recommendScore.push({
          $cond: [
            {
              $regexMatch: {
                input: "$genres_name",
                regex: genre,
                options: "i",
              },
            },
            weight,
            0,
          ],
        });
      }

      recommendedMovies = await MovieModel.aggregate([
        {
          $match: {
            is_delete: false,
            genres_name: {
              $regex: targetGenres.join("|"),
              $options: "i",
            },
          },
        },
        {
          $addFields: {
            recommendationScore: {
              $add: recommendScore,
            },
          },
        },
        {
          $sort: {
            recommendationScore: -1,
            total_rating: -1,
          },
        },
        {
          $limit: Number(limit),
        },
        // PERBAIKAN: Populate thumbnail_id di Aggregation
        {
          $lookup: {
            from: "images", // Sesuaikan nama koleksi image Anda di MongoDB
            localField: "thumbnail_id",
            foreignField: "_id",
            as: "thumbnail_id",
          },
        },
        {
          $unwind: { path: "$thumbnail_id", preserveNullAndEmptyArrays: true },
        },
        // PERBAIKAN: Batasi field yang ditampilkan
        {
          $project: {
            _id: 1,
            title: 1,
            slug: 1,
            synopsis: 1,
            genres_name: 1,
            release_date: 1,
            vote_rating: 1,
            "thumbnail_id._id": 1,
            "thumbnail_id.path": 1,
          },
        },
      ]);

      if (recommendedMovies.length > 0) {
        return res.status(200).json({
          success: true,
          messaging:
            "Movie recommendations retrieved successfully from user preference!",
          data: recommendedMovies,
        });
      }
    }

    // ==========================================
    // STRATEGI 2: REKOMENDASI BERDASARKAN LIKES DI KOTA USER
    // ==========================================
    if (user_region && user_city) {
      recommendedMovies = await CityStatMovieLikeModel.aggregate([
        {
          $match: {
            regionName: user_region,
            city: user_city,
            total_users_likes: { $gt: 0 },
          },
        },
        {
          $sort: { total_users_likes: -1 },
        },
        {
          $limit: Number(limit),
        },
        {
          $lookup: {
            from: "movies",
            localField: "movie_id",
            foreignField: "_id",
            as: "movie_details",
          },
        },
        {
          $unwind: "$movie_details",
        },
        {
          $match: {
            "movie_details.is_delete": false,
          },
        },
        // PERBAIKAN: Populate thumbnail_id milik movie_details di Aggregation
        {
          $lookup: {
            from: "images",
            localField: "movie_details.thumbnail_id",
            foreignField: "_id",
            as: "movie_details.thumbnail_id",
          },
        },
        {
          $unwind: {
            path: "$movie_details.thumbnail_id",
            preserveNullAndEmptyArrays: true,
          },
        },
        // PERBAIKAN: Batasi field yang ditampilkan ke dalam objek movie
        {
          $project: {
            _id: 0,
            movie: {
              _id: "$movie_details._id",
              title: "$movie_details.title",
              slug: "$movie_details.slug",
              synopsis: "$movie_details.synopsis",
              genres_name: "$movie_details.genres_name",
              vote_rating: "$movie_details.vote_rating",
              release_date: "$movie_details.release_date",
              thumbnail_id: {
                _id: "$movie_details.thumbnail_id._id",
                path: "$movie_details.thumbnail_id.path",
              },
            },
          },
        },
      ]);

      if (recommendedMovies.length > 0) {
        const mappedData = [];
        for (const element of recommendedMovies) {
          mappedData.push(element.movie);
        }
        return res.status(200).json({
          success: true,
          message: `Rekomendasi film terpopuler di kota ${user_city}`,
          data: mappedData,
        });
      }
    }

    // ==========================================
    // STRATEGI 3: REKOMENDASI BERDASARKAN TREN GENRE DI KOTA USER
    // ==========================================
    if (user_region && user_city) {
      const topGenresInCity = await CityStatMovieGenreModel.aggregate([
        {
          $match: {
            regionName: user_region,
            city: user_city,
            total_genre_likes: { $gt: 0 },
          },
        },
        {
          $sort: { total_genre_likes: -1 },
        },
        {
          $limit: 3,
        },
        {
          $lookup: {
            from: "genres",
            localField: "genre_id",
            foreignField: "_id",
            as: "genre_info",
          },
        },
        { $unwind: "$genre_info" },
        {
          $project: {
            genre_name: "$genre_info.name",
            weight: "$total_genre_likes",
          },
        },
      ]);

      if (topGenresInCity.length > 0) {
        const targetGenreNames = [];
        for (const genreCity of topGenresInCity) {
          targetGenreNames.push(genreCity.genre_name.toLowerCase());
        }

        const genreWeightMap = {};
        for (const genreCity of topGenresInCity) {
          genreWeightMap[genreCity.genre_name.toLowerCase()] = genreCity.weight;
        }

        recommendedMovies = await MovieModel.aggregate([
          {
            $match: {
              is_delete: false,
              genres_name: {
                $regex: targetGenreNames.join("|"),
                $options: "i",
              },
            },
          },
          {
            $addFields: {
              cityRecommendationScore: {
                $add: targetGenreNames.map((genre) => {
                  const weight = genreWeightMap[genre] || 0;
                  return {
                    $cond: [
                      {
                        $regexMatch: {
                          input: "$genres_name",
                          regex: genre,
                          options: "i",
                        },
                      },
                      weight,
                      0,
                    ],
                  };
                }),
              },
            },
          },
          {
            $sort: { cityRecommendationScore: -1, vote_rating: -1 },
          },
          {
            $limit: Number(limit),
          },
          // PERBAIKAN: Populate thumbnail_id di Aggregation Strategi 3
          {
            $lookup: {
              from: "images",
              localField: "thumbnail_id",
              foreignField: "_id",
              as: "thumbnail_id",
            },
          },
          {
            $unwind: {
              path: "$thumbnail_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          // PERBAIKAN: Batasi field yang ditampilkan
          {
            $project: {
              _id: 1,
              title: 1,
              slug: 1,
              synopsis: 1,
              genres_name: 1,
              release_date: 1,
              vote_rating: 1,
              "thumbnail_id._id": 1,
              "thumbnail_id.path": 1,
            },
          },
        ]);

        if (recommendedMovies.length > 0) {
          return res.status(200).json({
            success: true,
            message: `Rekomendasi film berdasarkan selera genre terbesar di kota ${user_city}`,
            data: recommendedMovies,
          });
        }
      }
    }

    // ==========================================
    // STRATEGI DEFAULT: FALLBACK KE NEW RELEASE MOVIE
    // ==========================================
    const populateField = [
      { path: "thumbnail_id", model: "Image", select: "_id path" },
    ];
    const defaultData = await MovieModel.find({ is_delete: false })
      .select(
        "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
      )
      .populate(populateField)
      .limit(Number(limit))
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      messaging:
        "Movie recommendations retrieved successfully from new releases!",
      data: defaultData,
    });
  } catch (err) {
    next(err);
  }
};

// GET MOVIE TRENDING
controller.getMovieCurrentTrending = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get movie trending'
    #swagger.description = 'Retrieve trending movies based on the accumulated total of user likes.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['type_trending'] = { default: 'day', description: 'menampilkan data trending berdasarkan day | week | month | year' }
  */
  try {
    const { limit = 10, type_trending } = req.query;
    // 1. Validasi & Mapping tipe trending Luxon (mencegah error dari input user)
    const validTrendingTypes = ["day", "week", "month", "year"];

    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
    ];

    if (type_trending && validTrendingTypes.includes(type_trending)) {
      const now = DateTime.now();
      query.created_at = {
        $gte: now.startOf(type_trending).toJSDate(),
        $lte: now.endOf(type_trending).toJSDate(),
      };
    }

    const result = await CityStatMovieLikeModel.find(query)
      .populate(populateField)
      .limit(Number(limit))
      .sort({ total_users_likes: -1 })
      .lean()
      .then((stats) => stats.map((stat) => stat.movie_id));

    res.status(200).json({
      success: true,
      messaging: "Movie trending retrieved successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET MOVIE POPULAR
controller.getMovieCurrentPopular = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get movie popular'
    #swagger.description = 'Retrieve top-trending movies based on total view counts.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['type_trending'] = { default: 'day', description: 'menampilkan data trending berdasarkan day | week | month | year' }
  */
  try {
    const { limit = 10, type_trending } = req.query;
    // 1. Validasi & Mapping tipe trending Luxon (mencegah error dari input user)
    const validTrendingTypes = ["day", "week", "month", "year"];

    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
    ];

    if (type_trending && validTrendingTypes.includes(type_trending)) {
      const now = DateTime.now();
      query.created_at = {
        $gte: now.startOf(type_trending).toJSDate(),
        $lte: now.endOf(type_trending).toJSDate(),
      };
    }

    const result = await CityStatMovieWatchModel.find(query)
      .populate(populateField)
      .limit(Number(limit))
      .sort({ total_users_watches: -1 })
      .lean()
      .then((stats) => stats.map((stat) => stat.movie_id));

    res.status(200).json({
      success: true,
      messaging: "Movie popular retrieved successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET NEW EPISODE RELEASE
controller.getNewReleaseEpisode = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get new release epiosde'
    #swagger.description = 'Retrieve newly released episodes.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
  */
  try {
    const { limit = 10 } = req.query;
    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
      {
        path: "episode_id",
        model: "Episode",
        select: "_id title episode_number slug",
      },
    ];

    const result = await EpisodeModel.find(query)
      .populate(populateField)
      .limit(Number(limit))
      .sort({ created_at: -1 })
      .lean()
      .then((episodes) =>
        episodes.map((episode) => ({
          // Menggunakan ?. untuk mengantisipasi jika movie_id ternyata null/tidak ketemu
          ...(episode.movie_id ?? {}),

          // Menggunakan optional chaining (?.) agar tidak crash jika episode_id null
          episode_id: episode.episode_id?._id,
          episode_title: episode.episode_id?.title,
          episode_number: episode.episode_id?.episode_number,
          episode_slug: episode.episode_id?.slug,
        })),
      );

    res.status(200).json({
      success: true,
      messaging: "Episode new release retrieved successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET EPISODE TRENDING
controller.getTrendingEpisode = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get epiosde trending'
    #swagger.description = 'Retrieve trending episode based on the accumulated total of user likes.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['type_trending'] = { default: 'day', description: 'menampilkan data trending berdasarkan day | week | month | year' }
  */
  try {
    const { limit = 10, type_trending } = req.query;
    // 1. Validasi & Mapping tipe trending Luxon (mencegah error dari input user)
    const validTrendingTypes = ["day", "week", "month", "year"];

    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
      {
        path: "episode_id",
        model: "Episode",
        select: "_id title episode_number slug",
      },
    ];

    if (type_trending && validTrendingTypes.includes(type_trending)) {
      const now = DateTime.now();
      query.created_at = {
        $gte: now.startOf(type_trending).toJSDate(),
        $lte: now.endOf(type_trending).toJSDate(),
      };
    }

    const result = await CityStatEpisodeLikeModel.find(query)
      .populate(populateField)
      .limit(Number(limit))
      .sort({ total_users_likes: -1 })
      .lean()
      .then((episodes) =>
        episodes.map((episode) => ({
          // Menggunakan ?. untuk mengantisipasi jika movie_id ternyata null/tidak ketemu
          ...(episode.movie_id ?? {}),

          // Menggunakan optional chaining (?.) agar tidak crash jika episode_id null
          episode_id: episode.episode_id._id,
          episode_title: episode.episode_id.title,
          episode_number: episode.episode_id.episode_number,
          episode_slug: episode.episode_id.slug,
        })),
      );

    res.status(200).json({
      success: true,
      messaging: "Episode trending retrieved successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET EPISODE POPULER
controller.getPopularEpisode = async (req, res, next) => {
  /* #swagger.tags = ['MOVIE']
    #swagger.summary = 'get epiosde trending'
    #swagger.description = 'Retrieve trending episode based on the accumulated total of user likes.'
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['type_trending'] = { default: 'day', description: 'menampilkan data trending berdasarkan day | week | month | year' }
  */
  try {
    const { limit = 10, type_trending } = req.query;
    // 1. Validasi & Mapping tipe trending Luxon (mencegah error dari input user)
    const validTrendingTypes = ["day", "week", "month", "year"];

    const query = {};
    const populateField = [
      {
        path: "movie_id",
        select:
          "_id title slug synopsis genres_name thumbnail_id release_date vote_rating",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
      {
        path: "episode_id",
        model: "Episode",
        select: "_id title episode_number slug",
      },
    ];

    if (type_trending && validTrendingTypes.includes(type_trending)) {
      const now = DateTime.now();
      query.created_at = {
        $gte: now.startOf(type_trending).toJSDate(),
        $lte: now.endOf(type_trending).toJSDate(),
      };
    }

    const result = await CityStatEpisodeWatchModel.find(query)
      .populate(populateField)
      .limit(Number(limit))
      .sort({ total_users_likes: -1 })
      .lean()
      .then((episodes) =>
        episodes.map((episode) => ({
          // Menggunakan ?. untuk mengantisipasi jika movie_id ternyata null/tidak ketemu
          ...(episode.movie_id ?? {}),

          // Menggunakan optional chaining (?.) agar tidak crash jika episode_id null
          episode_id: episode.episode_id._id,
          episode_title: episode.episode_id.title,
          episode_number: episode.episode_id.episode_number,
          episode_slug: episode.episode_id.slug,
        })),
      );

    res.status(200).json({
      success: true,
      messaging: "Episode popular retrieved successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = controller;
