const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const ScheduleMovieModel = require("../models/ScheduleMovie.model");
const controller = {};

controller.getAllScheduleGroup = async (req, res, next) => {
  /*
    #swagger.tags = ['SCHEDULE']
    #swagger.summary = 'Schedule'
    #swagger.description = 'Retrieve reference groups'
  */
  try {
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

    // 2. Run the Aggregation Pipeline
    const aggregationResult = await ScheduleMovieModel.aggregate([
      { $match: {} },
      { $sort: { _id: -1 } },

      // Populate movie_id (Equivalent to .populate())
      {
        $lookup: {
          from: "movies", // Make sure this matches your MongoDB collection name (case-sensitive)
          localField: "movie_id",
          foreignField: "_id",
          as: "movie_id",
        },
      },
      { $unwind: { path: "$movie_id", preserveNullAndEmptyArrays: true } },

      // Populate thumbnail_id inside movie_id
      {
        $lookup: {
          from: "images", // Make sure this matches your MongoDB collection name
          localField: "movie_id.thumbnail_id",
          foreignField: "_id",
          as: "movie_id.thumbnail_id",
        },
      },
      {
        $unwind: {
          path: "$movie_id.thumbnail_id",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Grouping stage by 'day'
      {
        $group: {
          _id: "$day", // Group by day field
          movies: {
            $push: {
              _id: "$movie_id._id",
              title: "$movie_id.title",
              slug: "$movie_id.slug",
              genres_name: "$movie_id.genres_name",
              thumbnail: {
                _id: "$movie_id.thumbnail_id._id",
                path: "$movie_id.thumbnail_id.path",
              },
              release_date: "$movie_id.release_date",
              time: "$time",
              start_date: "$start_date",
              due_date: "$due_date",
            },
          },
        },
      },

      // Final Projection to clean up the keys
      {
        $project: {
          _id: 0,
          day: "$_id",
          movies: 1,
        },
      },
    ]);

    // 3. Map the master array to guarantee all 7 days are included
    const finalResult = allDays.map((day) => {
      // Find if this specific day exists in the aggregation result
      const foundData = aggregationResult.find(
        (item) => item.day?.toLowerCase() === day.toLowerCase(),
      );

      return {
        day: day,
        // If data is found, return its movies. If not, or if it's empty, default to []
        movies:
          foundData && foundData.movies
            ? foundData.movies.filter((m) => m._id !== null)
            : [],
      };
    });

    res.status(200).json({
      success: true,
      message: "Data retrieved successfully!",
      data: finalResult, // Returns a clean, complete array of 7 days
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
