const mongoose = require('mongoose');

async function clearDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/upi_simulator');
        await mongoose.connection.db.dropDatabase();
        console.log('Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

clearDB();