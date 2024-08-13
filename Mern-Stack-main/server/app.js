const express = require('express');
const connectDB = require('./config/db');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', transactionRoutes);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
