const PlanModel = require("../models/Plan.model");
const crudServices = require("../../helper/crudService");
const controller = {};

controller.getAllPlans = async (req, res, next) => {
  /*
     #swagger.tags = ['PLANS']
     #swagger.summary = 'Plans'
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
    const arrFilter = [];
    if (search) {
      arrFilter.push({ title: { $regex: search, $options: "i" } });
    }
    if (arrFilter.length) query["$or"] = arrFilter;

    const [page_size, result] = await Promise.all([
      PlanModel.countDocuments(query),
      crudServices.findAllPagination(PlanModel, {
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

controller.createPlan = async (req, res, next) => {
  /*
    #swagger.tags = ['PLANS']
    #swagger.summary = 'Create Plan'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyPlanSchema' }
    }
  */
  try {
    const payload = req.body;

    const result = await crudServices.create(PlanModel, { data: payload });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

controller.updatePlan = async (req, res, next) => {
  /*
    #swagger.tags = ['PLANS']
    #swagger.summary = 'Update Plan'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'Plan ID' }
    #swagger.parameters['obj'] = {
      in: 'body',
      description: 'Update genre',
      schema: { $ref: '#/definitions/BodyPlanSchema' }
    }
  */
  try {
    const { id } = req.params;
    const payload = req.body;

    const isExist = await PlanModel.findOne({ _id: id }).lean();
    if (!isExist)
      return res
        .status(404)
        .json({ message: "Plan not found!", success: false, data: null });

    const result = await crudServices.update(PlanModel, { id, data: payload });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

controller.deletePlan = async (req, res, next) => {
  /*
    #swagger.tags = ['PLANS']
    #swagger.summary = 'Delete Plan'
    #swagger.description = 'untuk referensi group'
    #swagger.parameters['id'] = { description: 'Plan ID' }
  */
  try {
    const { id } = req.params;

    const isExist = await PlanModel.findOne({ _id: id });
    if (!isExist)
      return res
        .status(404)
        .json({ message: "Plan not found!", success: false, data: null });

    const result = await crudServices.delete(PlanModel, { id });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = controller;
