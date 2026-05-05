const alertFraudService = require('../services/alertFraud.service');

const check = async (req, res) => {
  try {
    const result = await alertFraudService.check(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { check };
