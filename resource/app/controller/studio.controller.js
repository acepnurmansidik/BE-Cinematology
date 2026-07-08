const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const StudioModel = require("../models/Studio.model");
const controller = {};

controller.getAllStudio = async (req, res, next) => {
  /*
    #swagger.tags = ['STUDIO']
    #swagger.summary = 'Studio'
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
      { path: "profile_id", model: "Image", select: "_id path" },
    ];
    if (search) {
      arrFilter.push({ name: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const [page_size, result] = await Promise.all([
      StudioModel.countDocuments(query),
      crudServices.findAllPagination(StudioModel, {
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

controller.createStudio = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['STUDIO']
    #swagger.summary = 'Studio'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create studio',
      schema: { $ref: '#/definitions/BodyStudioSchema' }
    }
  */
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.name);

    const result = await crudServices.create(StudioModel, { data: payload });
    res.status(201).json({
      code: 201,
      success: true,
      message: "Studio created successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.updateStudio = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['STUDIO']
    #swagger.summary = 'Studio'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id studio' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update studio',
      schema: { $ref: '#/definitions/BodyStudioSchema' }
    }
  */
    const { id } = req.params;
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.value);

    const result = await crudServices.update(StudioModel, {
      id,
      data: payload,
    });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Studio updated successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.deleteStudio = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['STUDIO']
    #swagger.summary = 'Studio'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id studio' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(StudioModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Studio deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
