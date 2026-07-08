const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const GenreModel = require("../models/Genre.model");
const controller = {};

controller.getAllGenre = async (req, res, next) => {
  /*
    #swagger.tags = ['GENRE']
    #swagger.summary = 'Genre'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['search'] = { default: '', description: 'search by value' }
    #swagger.parameters['limit'] = { default: 10, description: 'limit' }
    #swagger.parameters['page'] = { default: 1, description: 'page' }
  */
  try {
    const query = {};
    const populateField = [];
    const { search, page, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const arrFilter = [];
    if (search) {
      arrFilter.push({ name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const [page_size, result] = await Promise.all([
      GenreModel.countDocuments(query),
      crudServices.findAllPagination(GenreModel, {
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

controller.createGenre = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['GENRE']
    #swagger.summary = 'Genre'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create genre',
      schema: { $ref: '#/definitions/BodyGenreSchema' }
    }
  */
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.name);

    const data = await crudServices.create(GenreModel, {
      data: payload,
    });
    res.status(201).json({
      code: 201,
      success: true,
      message: "Genre created successfully!",
      data,
    });
  } catch (err) {
    next(err);
  }
};

controller.updateGenre = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['GENRE']
    #swagger.summary = 'Genre'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id genre' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyGenreSchema' }
    }
  */
    const { id } = req.params;
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.value);

    const result = await crudServices.update(GenreModel, { id, data: payload });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Genre updated successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.deleteGenre = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['GENRE']
    #swagger.summary = 'Genre'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id genre' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(GenreModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Genre deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
