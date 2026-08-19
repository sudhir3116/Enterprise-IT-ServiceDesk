/**
 * Unified Mongoose pagination and search helper.
 *
 * @param {MongooseModel} model       - Target Mongoose model
 * @param {Object}        baseFilter  - Base query filter (e.g. { organizationId, isDeleted: false })
 * @param {Object}        queryParams - Request query parameters (page, limit, search, sort, populate)
 * @param {Array<string>} searchFields- Array of string fields to match on search (e.g. ['title', 'ticketNumber'])
 */
const paginateQuery = async (model, baseFilter = {}, queryParams = {}, searchFields = []) => {
  const page  = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 20));
  const skip  = (page - 1) * limit;

  const filter = { ...baseFilter };

  // Text / multi-field search handling
  if (queryParams.q && queryParams.q.trim()) {
    const searchTerm = queryParams.q.trim();
    if (searchFields.length > 0) {
      filter.$or = searchFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      }));
    } else {
      filter.$text = { $search: searchTerm };
    }
  }

  // Sorting
  const sort = queryParams.sort || "-createdAt";

  // Population handling
  let query = model.find(filter).sort(sort).skip(skip).limit(limit);

  if (queryParams.populate) {
    if (Array.isArray(queryParams.populate)) {
      queryParams.populate.forEach((p) => { query = query.populate(p); });
    } else {
      query = query.populate(queryParams.populate);
    }
  }

  const [items, total] = await Promise.all([
    query.exec(),
    model.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = { paginateQuery };
