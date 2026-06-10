const summary = async (Model, req, res) => {
  //  Query the database for a list of all results
  const countPromise = Model.countDocuments({
    removed: false,
  });

  const filterPromise = Model.countDocuments({
    removed: false,
  })
    .where(req.query.filter)
    .equals(req.query.equal)
    .exec();

  // Resolving both promises
  const [countFilter, countAllDocs] = await Promise.all([filterPromise, countPromise]);

  if (countAllDocs > 0) {
    return res.status(200).json({
      success: true,
      result: { countFilter, countAllDocs },
      message: 'Successfully count all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: { countFilter: 0, countAllDocs: 0 },
      message: 'Collection is Empty',
    });
  }
};

module.exports = summary;
