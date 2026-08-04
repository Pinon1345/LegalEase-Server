const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config();

const cors = require('cors');
const app = express();
const port = process.env.PORT;


app.use(cors());
app.use(express.json());




const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });


        // Connect Database with Server

        const db = client.db('LegalEase')


        // Creating Data Collections in Database


        const lawyerCollection = db.collection('lawyers');
        const clientsCollection = db.collection('clients');
        const hiringCollection = db.collection('hiring');
        const servicesCollection = db.collection('services');
        const paymentCollection = db.collection('payment');
        const commentsCollection = db.collection('comments');
        const transactionsCollection = db.collection('transactions');




        // Start API


        // Post API for creating Lawyers

        app.post('/api/lawyer', async (req, res) => {

            const {
                lawyerImage,
                lawyerName,
                specialization,
                hourlyRate,
                averageRating,
                totalReviews,
                yearsExperience,
                languages,
                location,
                isVerified
            } = req.body;

            const addData = {
                lawyerImage,
                lawyerName,
                specialization,
                hourlyRate,
                averageRating,
                totalReviews,
                yearsExperience,
                languages,
                location,
                isVerified,
                availabilityStatus: "busy",
                createdAt: new Date(),
            };

            const result = await lawyerCollection.insertOne(addData);
            return result;

        });





        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {

        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Hello World! This is LegalEase Client Side!');
});

app.listen(port, () => {
    console.log(`LegalEase Server listening on port ${port}`);
});