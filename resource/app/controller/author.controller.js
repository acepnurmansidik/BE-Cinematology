const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const AuthorModel = require("../models/Author.model");
const controller = {};

controller.getAllAuthor = async (req, res, next) => {
  /*
    #swagger.tags = ['AUTHORS']
    #swagger.summary = 'Author'
    #swagger.description = 'untuk referensi group'
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
    const arrFilter = [
      { path: "avatar_id", model: "Image", select: "_id path" },
    ];
    if (search) {
      arrFilter.push({ name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const page_size = await AuthorModel.countDocuments(query);
    const result = await crudServices.findAllPagination(AuthorModel, {
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

controller.createAuthor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['AUTHORS']
    #swagger.summary = 'Author'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create author',
      schema: { $ref: '#/definitions/BodyAuthorSchema' }
    }
  */
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.name);

    const isExist = await AuthorModel.findOne({ slug: payload.slug });

    if (isExist)
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Author already exists!",
        data: "",
      });

    const result = await crudServices.create(AuthorModel, { data: payload });
    res.status(201).json({
      code: 201,
      success: true,
      message: "Author created successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.updateAuthor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['AUTHORS']
    #swagger.summary = 'Author'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id author' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update author',
      schema: { $ref: '#/definitions/BodyAuthorSchema' }
    }
  */
    const { id } = req.params;
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.value);

    const isExist = await crudServices.findOne(AuthorModel, {
      query: { _id: { $ne: id }, slug: payload.slug },
    });

    if (isExist)
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Author already exists!",
        data: "",
      });

    const result = await crudServices.update(AuthorModel, {
      id,
      data: payload,
    });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Author updated successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.deleteAuthor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['AUTHORS']
    #swagger.summary = 'Author'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id author' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(AuthorModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Author deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
