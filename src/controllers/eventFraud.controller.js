const eventFraudService = require('../services/eventFraud.service');

const check = async (req, res) => {
  try {
    const result = await eventFraudService.check(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { check };
