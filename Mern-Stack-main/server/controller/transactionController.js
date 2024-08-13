const axios = require('axios');
const Transaction = require('../models/transactionModel');

exports.initDatabase = async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);

        res.status(200).send({ message: 'Database initialized with seed data' });
    } catch (error) {
        res.status(500).send({ message: 'Error initializing database', error });
    }
};

exports.getTransactions = async (req, res) => {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const query = {
        $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: parseFloat(search) || 0 },
        ],
    };

    try {
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(parseInt(perPage));

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching transactions', error });
    }
};

exports.getStatistics = async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(`${month}-31`);

    try {
        const totalSales = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, totalSales: { $sum: '$price' } } },
        ]);

        const soldItemsCount = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lte: endDate },
            sold: true,
        });

        const unsoldItemsCount = await Transaction.countDocuments({
            dateOfSale: { $gte: startDate, $lte: endDate },
            sold: false,
        });

        res.status(200).json({
            totalSales: totalSales[0].totalSales,
            soldItemsCount,
            unsoldItemsCount,
        });
    } catch (error) {
        res.status(500).send({ message: 'Error fetching statistics', error });
    }
};

exports.getBarChart = async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(`${month}-31`);

    const priceRanges = [
        { range: '0-100', min: 0, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '201-300', min: 201, max: 300 },
        { range: '301-400', min: 301, max: 400 },
        { range: '401-500', min: 401, max: 500 },
        { range: '501-600', min: 501, max: 600 },
        { range: '601-700', min: 601, max: 700 },
        { range: '701-800', min: 701, max: 800 },
        { range: '801-900', min: 801, max: 900 },
        { range: '901-above', min: 901, max: Infinity },
    ];

    try {
        const results = await Promise.all(
            priceRanges.map(async (range) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $gte: startDate, $lte: endDate },
                    price: { $gte: range.min, $lte: range.max },
                });
                return { range: range.range, count };
            })
        );

        res.status(200).json(results);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching bar chart data', error });
    }
};

exports.getPieChart = async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(`${month}-31`);

    try {
        const categories = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        res.status(200).json(categories);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching pie chart data', error });
    }
};

exports.getCombinedData = async (req, res) => {
    const { month } = req.query;

    try {
        const [statistics, barChart, pieChart] = await Promise.all([
            axios.get('http://localhost:3000/api/statistics', { params: { month } }),
            axios.get('http://localhost:3000/api/bar-chart', { params: { month } }),
            axios.get('http://localhost:3000/api/pie-chart', { params: { month } }),
        ]);

        res.status(200).json({
            statistics: statistics.data,
            barChart: barChart.data,
            pieChart: pieChart.data,
        });
    } catch (error) {
        res.status(500).send({ message: 'Error fetching combined data', error });
    }
};
