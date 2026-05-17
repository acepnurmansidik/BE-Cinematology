const { default: mongoose } = require("mongoose");
const logActionModel = require("../app/models/LogAction.model");

const crudServices = {};

// FIND BY ID
crudServices.findOneById = async (
  model,
  { id, populateField, selectField },
) => {
  try {
    const result = await model
      .findOne({ _id: id, is_delete: { $ne: true } })
      .populate(populateField)
      .select(`${selectField ?? ""} -__v -updatedAt -is_delete`)
      .lean();

    if (!result) throw new Error(`data with id: '${id}' not found!`);

    return {
      success: true,
      message: "Data retrieved successfully!",
      data: result,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// FINDONE
crudServices.findOne = async (model, { query, populateField, selectField }) => {
  try {
    const result = await model
      .findOne({ ...query, is_delete: { $ne: true } })
      .populate(populateField)
      .select(`${selectField ?? ""} -__v -updatedAt -is_delete`);

    return {
      success: true,
      message: "Data retrieved successfully!",
      data: result,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// FIND ALL
crudServices.findAll = async (
  model,
  { query, populateField, selectField = "" },
) => {
  try {
    const result = await model
      .find({ ...query, is_delete: { $ne: true } }, {})
      .populate(populateField)
      .select(`${selectField} -updatedAt -is_delete`)
      .sort({ _id: -1 });

    return {
      success: true,
      message: "Data retrieved successfully!",
      data: result,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// FIND ALL
crudServices.findAllPagination = async (
  model,
  { query, populateField, selectField = "", skip, limit = 10 },
) => {
  try {
    console.log(selectField);
    const result = await model
      .find({ ...query, is_delete: { $ne: true } }, {})
      .populate(populateField)
      .select(`${selectField} -updated_at -is_delete`)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      message: "Data retrieved successfully!",
      data: result,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// CREATE
crudServices.create = async (model, { data }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await model.create([data], { session });

    const log = {
      type: "CREATE",
      target_id: result[0]._id, // id of the created document
      after: result[0],
      source: model.collection.collectionName,
    };

    await logActionModel.create([log], { session });
    await session.commitTransaction();

    delete result[0].is_delete;
    delete result[0].updatedAt;
    return {
      success: true,
      message: "Data created successfully!",
      data: result[0],
    };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message);
  } finally {
    await session.endSession();
  }
};

// UPDATE
crudServices.update = async (model, { id, data }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [dataUpdate, dataOld] = await Promise.all([
      model.findByIdAndUpdate(id, data, {
        returnDocument: "after",
        runValidators: true,
        session,
      }),
      model.findOne({ _id: id }).lean(),
    ]);

    if (!dataUpdate) throw new Error(`data not found!`);

    delete dataUpdate.is_delete;
    delete dataUpdate.updatedAt;

    const log = {
      type: "UPDATE",
      target_id: dataUpdate._id, // id of the created document
      before: dataOld,
      after: dataUpdate,
      source: model.collection.collectionName,
    };

    await logActionModel.create([log], { session });

    await session.commitTransaction();
    return {
      success: true,
      message: "Data updated successfully!",
      data: dataUpdate,
    };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message);
  } finally {
    await session.endSession();
  }
};

// DELETE
crudServices.delete = async (model, { id, data }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await model.findOneAndUpdate(
      { _id: id, is_delete: false },
      { is_delete: true, ...data },
      {
        runValidators: true,
        session,
        returnDocument: "after",
      },
    );

    if (!result) throw new Error(`data with id: '${id}' not found!`);

    const log = {
      type: "DELETE",
      target_id: result._id, // id of the created document
      after: result,
      source: model.collection.collectionName,
    };

    await logActionModel.create([log], { session });

    await session.commitTransaction();
    return {
      success: true,
      message: "Data deleted successfully!",
      data: result,
    };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message);
  } finally {
    await session.endSession();
  }
};

module.exports = crudServices;
