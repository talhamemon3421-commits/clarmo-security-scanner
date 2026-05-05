const express = require('express');
const fraudRoutes = require('./src/routes/fraud.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/fraud/check', fraudRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'Clarmo — Fraud Detection Module',
    version: '1.0.0',
    endpoints: [
      'POST /api/fraud/check/user',
      'POST /api/fraud/check/post',
      'POST /api/fraud/check/marketplace-item',
      'POST /api/fraud/check/event',
      'POST /api/fraud/check/alert',
      'POST /api/fraud/check/review',
      'POST /api/fraud/check/comment',
      'POST /api/fraud/check/service',
      'POST /api/fraud/check/message'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Clarmo Fraud Detection Module running on port ${PORT}`);
});
