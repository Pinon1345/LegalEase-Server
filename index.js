const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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



        // =============== LAWYER ROUTES ===============



        // 1. GET API to fetch ALL lawyers (Fixes the /lawyers page & specializations filter)


        app.get('/api/lawyers', async (req, res) => {
            try {
                const lawyers = await lawyerCollection.find({}).toArray();
                res.status(200).send(lawyers);
            } catch (error) {
                console.error("Error fetching lawyers:", error);
                res.status(500).send({ message: "Failed to fetch lawyers" });
            }
        });


        // 2. GET API to fetch Single Lawyer 


        app.get('/api/single-lawyers/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await lawyerCollection.findOne(query);

            res.send(result);
        })


        // 3. GET API to fetch single lawyer profile by Auth User ID


        app.get('/api/lawyers/user/:userId', async (req, res) => {
            try {
                const { userId } = req.params;
                const result = await lawyerCollection.findOne({ userId: userId });

                if (!result) {
                    return res.status(404).send({ message: "Lawyer profile not found" });
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching lawyer by userId:", error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // 4. POST API for creating Lawyer Profile


        app.post('/api/lawyer', async (req, res) => {
            try {
                const {
                    userId,
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
                    userId,
                    lawyerImage: lawyerImage || "https://i.ibb.co/0jK2cQVR/lawyer-1.jpg",
                    lawyerName,
                    specialization,
                    hourlyRate: Number(hourlyRate) || 0,
                    averageRating: Number(averageRating) || 5,
                    totalReviews: Number(totalReviews) || 0,
                    yearsExperience: Number(yearsExperience) || 0,
                    languages: Array.isArray(languages) ? languages : (languages ? languages.split(',').map(l => l.trim()) : []),
                    location,
                    isVerified: isVerified ?? true,
                    availabilityStatus: "available",
                    createdAt: new Date(),
                };

                const result = await lawyerCollection.insertOne(addData);
                res.status(201).send(result);
            } catch (error) {
                console.error("Error creating lawyer:", error);
                res.status(500).send({ message: "Failed to create lawyer profile" });
            }
        });


        // 5. PATCH API to update Lawyer profile


        app.patch('/api/lawyer/:id', async (req, res) => {
            try {
                const { id } = req.params;
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
                    isVerified,
                    availabilityStatus
                } = req.body;

                const updateData = {
                    lawyerImage,
                    lawyerName,
                    specialization,
                    hourlyRate: Number(hourlyRate),
                    averageRating: Number(averageRating),
                    totalReviews: Number(totalReviews),
                    yearsExperience: Number(yearsExperience),
                    languages: Array.isArray(languages) ? languages : (languages ? languages.split(',').map(l => l.trim()) : []),
                    location,
                    isVerified,
                    availabilityStatus: availabilityStatus || "available",
                    updatedAt: new Date(),
                };

                const result = await lawyerCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );

                res.send(result);
            } catch (error) {
                console.error("Error updating lawyer profile:", error);
                res.status(500).send({ message: "Failed to update profile" });
            }
        });


        // 6. DELETE API for deleting Lawyer Profile


        app.delete('/api/lawyer/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await lawyerCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Lawyer profile not found" });
                }

                res.send({ success: true, message: "Profile deleted successfully", result });
            } catch (error) {
                console.error("Error deleting lawyer profile:", error);
                res.status(500).send({ message: "Failed to delete lawyer profile" });
            }
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