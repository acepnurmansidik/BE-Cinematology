const crudServices = require("../../helper/crudService");
const globalService = require("../../helper/global-func");
const ActorModel = require("../models/Actor.model");
const controller = {};

controller.getAllActor = async (req, res, next) => {
  /*
    #swagger.tags = ['ACTOR']
    #swagger.summary = 'Actor'
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

    const page_size = await ActorModel.countDocuments(query);
    const result = await crudServices.findAllPagination(ActorModel, {
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

controller.createActor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['ACTOR']
    #swagger.summary = 'Actor'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Create actor',
      schema: { $ref: '#/definitions/BodyActorSchema' }
    }
  */
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.name);

    const isExist = await ActorModel.findOne({ slug: payload.slug });

    if (isExist)
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Actor already exists!",
        data: "",
      });
    console.log(payload);

    const result = await crudServices.create(ActorModel, { data: payload });
    res.status(201).json({
      code: 201,
      success: true,
      message: "Actor created successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.updateActor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['ACTOR']
    #swagger.summary = 'Actor'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id actor' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update actor',
      schema: { $ref: '#/definitions/BodyActorSchema' }
    }
  */
    const { id } = req.params;
    const payload = req.body;
    payload.name = payload.name.toLowerCase();
    payload.slug = globalService.createSlug(payload.value);

    const isExist = await crudServices.findOne(ActorModel, {
      query: { _id: { $ne: id }, slug: payload.slug },
    });

    if (isExist)
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Actor already exists!",
        data: "",
      });

    const result = await crudServices.update(ActorModel, { id, data: payload });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Actor updated successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

controller.deleteActor = async (req, res, next) => {
  try {
    /*
    #swagger.tags = ['ACTOR']
    #swagger.summary = 'Actor'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'id actor' }
  */
    const { id } = req.params;
    const result = await crudServices.delete(ActorModel, { id });
    res.status(200).json({
      code: 200,
      success: true,
      message: "Actor deleted successfully!",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = controller;
