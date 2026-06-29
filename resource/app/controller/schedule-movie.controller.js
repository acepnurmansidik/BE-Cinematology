const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const { getOrSetCache } = require("../../helper/redis-cache");
const ScheduleMovieModel = require("../models/ScheduleMovie.model");
const controller = {};

controller.getAllScheduleGroup = async (req, res, next) => {
  /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'Schedule'
    #swagger.description = 'Retrieve reference groups with active due date and genre filter supporting Movie and Season models'
    #swagger.parameters['genre'] = { in: 'query', type: 'string', description: 'Filter by movie or season genre name' }
  */
  try {
    const { genre } = req.query;
    const today = new Date();

    const cacheKey = "schedule:movie";

    const newResult = await getOrSetCache({
      key: cacheKey,
      fetchFunction: async () => {
        // 1. Define the master list of all days in English
        const allDays = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];

        // 2. Setup match conditions awal untuk Schedule
        const initialMatch = {
          is_delete: { $ne: true },
          due_date: { $gte: today },
        };

        const pipeline = [
          { $match: initialMatch },
          { $sort: { _id: -1 } },

          // --- TAHAPAN LOOKUP DINAMIS (Mendukung Movie & Season) ---
          // Lookup ke koleksi 'movies'
          {
            $lookup: {
              from: "movies",
              localField: "movie_id",
              foreignField: "_id",
              as: "movie_data",
            },
          },
          // Lookup ke koleksi 'seasons'
          {
            $lookup: {
              from: "seasons",
              localField: "movie_id",
              foreignField: "_id",
              as: "season_data",
            },
          },

          // Satukan hasil lookup ke dalam satu object target utama berdasarkan on_model
          {
            $project: {
              day: 1,
              time: 1,
              start_date: 1,
              due_date: 1,
              on_model: 1,
              raw_id: "$movie_id",
              // Jika on_model adalah Movie, ambil element pertama movie_data, jika Season ambil season_data
              resolved_content: {
                $cond: {
                  if: { $eq: ["$on_model", "Movie"] },
                  then: { $arrayElemAt: ["$movie_data", 0] },
                  else: { $arrayElemAt: ["$season_data", 0] },
                },
              },
            },
          },

          // Filter dokumen yang content-nya tidak ditemukan (misal ID salah atau data induk dihapus)
          { $match: { resolved_content: { $exists: true, $ne: null } } },

          // --- TAHAPAN FILTER GENRE (DINAMIS BERDASARKAN STRING/ARRAY) ---
          ...(genre
            ? [
                {
                  $match: {
                    "resolved_content.genres_name": {
                      $regex: genre.trim(),
                      $options: "i",
                    },
                  },
                },
              ]
            : []),

          // --- TAHAPAN POPULATE THUMBNAIL INSIDE CONTENT ---
          {
            $lookup: {
              from: "images",
              localField: "resolved_content.thumbnail_id",
              foreignField: "_id",
              as: "resolved_content.thumbnail_id",
            },
          },
          {
            $unwind: {
              path: "$resolved_content.thumbnail_id",
              preserveNullAndEmptyArrays: true,
            },
          },

          // --- STAGE GROUPING BY DAY ---
          {
            $group: {
              _id: "$day",
              movies: {
                $push: {
                  _id: "$resolved_content._id",
                  // Menggunakan operator $ifNull agar aman jika field penamaan di DB berbeda (title vs season_name)
                  title: {
                    $ifNull: [
                      "$resolved_content.title",
                      "$resolved_content.season_name",
                    ],
                  },
                  slug: "$resolved_content.slug",
                  genres_name: "$resolved_content.genres_name",
                  on_model: "$on_model", // Menyertakan penanda tipe konten untuk Front-End
                  thumbnail: {
                    _id: "$resolved_content.thumbnail_id._id",
                    path: "$resolved_content.thumbnail_id.path",
                  },
                  release_date: "$resolved_content.release_date",
                  time: "$time",
                  start_date: "$start_date",
                  due_date: "$due_date",
                },
              },
            },
          },

          // Final Projection untuk membersihkan output keys
          {
            $project: {
              _id: 0,
              day: "$_id",
              movies: 1,
            },
          },
        ];

        // Jalankan Aggregation Pipeline
        const aggregationResult = await ScheduleMovieModel.aggregate(pipeline);

        // 3. Map the master array to guarantee all 7 days are included
        const finalResult = allDays.map((day) => {
          const foundData = aggregationResult.find(
            (item) => item.day?.toLowerCase() === day.toLowerCase(),
          );

          return {
            day: day,
            movies:
              foundData && foundData.movies
                ? foundData.movies.filter((m) => m._id !== null)
                : [],
          };
        });

        return finalResult;
      },
    });

    res.status(200).json({
      success: true,
      message: "Data retrieved successfully!",
      data: newResult,
    });
  } catch (err) {
    next(err);
  }
};

controller.getAllSchedule = async (req, res, next) => {
  /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'Schdule'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const { search, page, limit = 10 } = req.query;
    const populateField = [
      {
        path: "movie_id",
        model: "Movie",
        select: "_id title slug genres_name thumbnail_id release_date",
        populate: { path: "thumbnail_id", model: "Image", select: "_id path" },
      },
    ];
    const skip = (page - 1) * limit;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await ScheduleMovieModel.countDocuments(query);
    const result = await crudServices
      .findAllPagination(ScheduleMovieModel, {
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
            time: item.time,
            day: item.day,
            start_date: item.start_date,
            due_date: item.due_date,
          };
        }),
      );
    res.status(200).json({
      success: true,
      data: result,
      message: "Data retrieved successfully!",
      page_size,
      current_page: Number(page),
    });
  } catch (err) {
    next(err);
  }
};

controller.createSchedule = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'SCHEDULE'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create Schedule',
      schema: { $ref: '#/definitions/BodyScheduleMovieSchema' }
    }
  */
    const payload = req.body;
    payload.on_model = payload.type;
    delete payload.type;

    const result = await crudServices.create(ScheduleMovieModel, {
      data: payload,
    });
    res.status(201).json({
      code: 201,
      success: true,
      message: "Schedule created successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.updateSchedule = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'SCHEDULE'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id schedule' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update schedule',
      schema: { $ref: '#/definitions/BodyScheduleMovieSchema' }
    }
  */
    const { id } = req.params;
    const payload = req.body;
    payload.on_model = payload.type;
    delete payload.type;

    const result = await crudServices.update(ScheduleMovieModel, {
      id,
      data: payload,
    });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Schedule updated successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.deleteSchedule = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'SCHEDULE'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id schedule' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(ScheduleMovieModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Schedule deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
