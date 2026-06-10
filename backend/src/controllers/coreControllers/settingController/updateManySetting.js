const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const updateManySetting = async (req, res) => {
  // req/body = [{settingKey:"",settingValue}]
  let settingsHasError = false;
  const updateDataArray = [];
  const { settings } = req.body;

  for (const setting of settings) {
    if (!setting.hasOwnProperty('settingKey')) {
      settingsHasError = true;
      break;
    }

    const { settingKey, settingCategory } = setting;
    const settingValue = setting.hasOwnProperty('settingValue') ? setting.settingValue : '';

    updateDataArray.push({
      updateMany: {
        filter: { settingKey: settingKey },
        update: {
          $set: {
            settingValue: settingValue,
            settingCategory: settingCategory,
            removed: false,
            enabled: true,
            isPrivate: false
          }
        },
        upsert: true,
      },
    });
  }

  if (updateDataArray.length === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settings provided ',
    });
  }
  if (settingsHasError) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'Settings provided has Error',
    });
  }
  const result = await Model.bulkWrite(updateDataArray);

  if (!result || (result.nMatched < 1 && result.nUpserted < 1 && result.nModified < 1)) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No settings found by to update',
    });
  } else {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'we update all settings',
    });
  }
};

module.exports = updateManySetting;
