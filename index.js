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

        // Connect the client to the server (optional starting in v4.7)
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
        const bookingCollection = db.collection('booking');
        const bookingPaymentCollection = db.collection('booking-payment');
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

                // Find lawyer profile and completed payment record

                const lawyerProfile = await lawyerCollection.findOne({ userId: userId });
                const paymentRecord = await paymentCollection.findOne({
                    userId: userId,
                    verifyStatus: "completed"
                });

                // Computed verification status: true if paid OR if manually marked verified in lawyer profile

                const isVerified = Boolean(paymentRecord || lawyerProfile?.isVerified);

                // Case A: No lawyer profile created yet

                if (!lawyerProfile) {
                    return res.status(200).send({
                        isVerified: isVerified,
                        profile: null
                    });
                }

                // Case B: Profile exists -> Return profile data with dynamic isVerified

                res.send({
                    ...lawyerProfile,
                    isVerified: isVerified
                });
            } catch (error) {
                console.error("Error fetching lawyer by userId:", error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // 3b. POST API to save verification payment state


        app.post('/api/lawyers/verify-payment', async (req, res) => {
            try {
                const { userId, sessionId } = req.body;
                if (!userId) {
                    return res.status(400).send({ message: "userId is required" });
                }

                const paymentDoc = {
                    userId,
                    sessionId: sessionId || null,
                    type: "lawyer_verification",
                    verifyStatus: "completed",
                    createdAt: new Date()
                };

                await paymentCollection.updateOne(
                    { userId: userId },
                    { $set: paymentDoc },
                    { upsert: true }
                );

                res.status(200).send({ success: true, message: "Payment verification saved" });
            } catch (error) {
                console.error("Error saving payment verification:", error);
                res.status(500).send({ message: "Failed to save payment verification" });
            }
        });


        // // *. GET API for Lawyer Booking Data

        // app.get('/api/lawyers/booking/:email', async (req, res) => {
        //     const { email } = req.params;
        //     const result = bookingCollection.find({ clientEmail: email }).toArray()
        //     return result;
        // })


        // 4. POST API for Lawyer Hiring Payment

        app.post('/api/lawyers/booking-payment', async (req, res) => {
            try {
                const { amount, lawyerId, lawyerName, paymentStatus, email, paymentType, transactionId } = req.body;
                // console.log(req.body);

                const bookingData = {
                    lawyerId,
                    lawyerName,
                    amount,
                    clientEmail: email,
                    paymentType,
                    transactionId,
                    paymentStatus,
                    bookingDate: new Date(),
                }

                const isBookingExist = await bookingCollection.findOne({ transactionId });
                if (isBookingExist) {
                    return res.status(407).send({ message: "Already Paid!" })
                }

                const bookingRes = await bookingCollection.insertOne(bookingData);

                const bookingPaymentData = {
                    clientEmail: email,
                    lawyerName,
                    amount,
                    transactionId,
                    paymentStatus,
                    paymentType,
                }
                await bookingPaymentCollection.insertOne(bookingPaymentData)

                res.send(bookingRes);


            } catch (error) {
                console.error("Error saving payment verification:", error);
                res.status(500).send({ message: "Failed to save payment verification" });
            }
        })


        // 5. POST API for creating Lawyer Profile


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

                const result = await lawyerCollection.insertOne({
                    ...addData,
                    status: 'pending',
                });
                res.status(201).send(result);
            } catch (error) {
                console.error("Error creating lawyer:", error);
                res.status(500).send({ message: "Failed to create lawyer profile" });
            }
        });


        // 6. PATCH API to update Lawyer profile


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


        // 7. DELETE API for deleting Lawyer Profile


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




        // ================= HIRING & BOOKING ROUTES =================



        // 1. Create a new Hiring Request (Auto-fetches lawyerImage from database)

        app.post('/api/hire-lawyer', async (req, res) => {
            try {
                const {
                    lawyerId,
                    lawyerName,
                    lawyerImage,
                    specialization,
                    fee,
                    scheduledDate,
                    scheduledSlot,
                    clientEmail,
                    clientName
                } = req.body;

                if (!lawyerId || !clientEmail) {
                    return res.status(400).send({ message: "Missing required fields" });
                }

                // Fetch lawyer profile directly from database as single source of truth

                let fetchedLawyer = null;
                if (ObjectId.isValid(lawyerId)) {
                    fetchedLawyer = await lawyerCollection.findOne({ _id: new ObjectId(lawyerId) });
                }

                const hiringDoc = {
                    lawyerId: new ObjectId(lawyerId),
                    lawyerName: lawyerName || fetchedLawyer?.lawyerName || "Lawyer",
                    // Priority: client payload image -> DB image -> fallback avatar URL
                    lawyerImage: lawyerImage || fetchedLawyer?.lawyerImage || "https://i.ibb.co/0jK2cQVR/lawyer-1.jpg",
                    specialization: specialization || fetchedLawyer?.specialization || "General Legal",
                    fee: Number(fee || fetchedLawyer?.hourlyRate || 0),
                    scheduledDate,
                    scheduledSlot,
                    clientEmail,
                    clientName: clientName || "Client",
                    status: "pending", // pending, accepted, rejected
                    paymentStatus: "unpaid", // unpaid, paid
                    createdAt: new Date(),
                };

                const result = await hiringCollection.insertOne(hiringDoc);
                res.status(201).send({ success: true, insertedId: result.insertedId, doc: hiringDoc });
            } catch (error) {
                console.error("Error creating hire request:", error);
                res.status(500).send({ message: "Failed to create hiring request" });
            }
        });


        // 2. Get Hiring Requests with Dynamic Image Lookup

        app.get('/api/hire-lawyer', async (req, res) => {
            try {
                const { email } = req.query;

                const matchQuery = email ? { clientEmail: email } : {};

                // Aggregate to dynamically attach latest lawyer details from 'lawyers' collection
                const result = await hiringCollection.aggregate([
                    { $match: matchQuery },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: 'lawyers',
                            localField: 'lawyerId',
                            foreignField: '_id',
                            as: 'lawyerDetails'
                        }
                    },
                    {
                        $addFields: {
                            lawyerInfo: { $arrayElemAt: ['$lawyerDetails', 0] }
                        }
                    },
                    {
                        $addFields: {
                            // Ensures lawyerImage always has a value even if missing in hiring collection
                            lawyerImage: {
                                $ifNull: ['$lawyerImage', '$lawyerInfo.lawyerImage', 'https://i.ibb.co/0jK2cQVR/lawyer-1.jpg']
                            },
                            lawyerName: {
                                $ifNull: ['$lawyerName', '$lawyerInfo.lawyerName', 'Lawyer']
                            },
                            specialization: {
                                $ifNull: ['$specialization', '$lawyerInfo.specialization', 'General Legal']
                            }
                        }
                    },
                    {
                        $project: { lawyerDetails: 0, lawyerInfo: 0 } // Clean up temp fields
                    }
                ]).toArray();

                res.status(200).send(result);
            } catch (error) {
                console.error("Error fetching hiring records:", error);
                res.status(500).send({ message: "Failed to fetch hiring records" });
            }
        });


        // 3. Fetch Client's Hiring History (With lookup fallback)

        app.get('/api/user/hiring-history/:email', async (req, res) => {
            try {
                const { email } = req.params;

                const history = await hiringCollection.aggregate([
                    { $match: { clientEmail: email } },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: 'lawyers',
                            localField: 'lawyerId',
                            foreignField: '_id',
                            as: 'lawyerDetails'
                        }
                    },
                    {
                        $addFields: {
                            lawyerInfo: { $arrayElemAt: ['$lawyerDetails', 0] }
                        }
                    },
                    {
                        $addFields: {
                            lawyerImage: {
                                $ifNull: ['$lawyerImage', '$lawyerInfo.lawyerImage', 'https://i.ibb.co/0jK2cQVR/lawyer-1.jpg']
                            }
                        }
                    },
                    {
                        $project: { lawyerDetails: 0, lawyerInfo: 0 }
                    }
                ]).toArray();

                res.status(200).send(history);
            } catch (error) {
                console.error("Error fetching hiring history:", error);
                res.status(500).send({ message: "Failed to fetch hiring history" });
            }
        });

        

        // 4. Fetch Lawyer's Incoming Requests

        app.get('/api/lawyer/hiring-requests/:lawyerId', async (req, res) => {
            try {
                const { lawyerId } = req.params;
                const requests = await hiringCollection
                    .find({ lawyerId: new ObjectId(lawyerId) })
                    .sort({ createdAt: -1 })
                    .toArray();
                res.status(200).send(requests);
            } catch (error) {
                console.error("Error fetching lawyer requests:", error);
                res.status(500).send({ message: "Failed to fetch requests" });
            }
        });


        // 5. Update Hiring Request Status (Lawyer Accept / Reject)

        app.patch('/api/hiring/update-status/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body; // "accepted" or "rejected"

                const result = await hiringCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status, updatedAt: new Date() } }
                );

                res.status(200).send({ success: true, result });
            } catch (error) {
                console.error("Error updating hiring status:", error);
                res.status(500).send({ message: "Failed to update status" });
            }
        });


        // 6. Update Payment Status (Called after successful Stripe Checkout)

        app.patch('/api/hiring/payment-success', async (req, res) => {
            try {
                const { hiringId, transactionId } = req.body;

                // Update hiring record status to paid
                await hiringCollection.updateOne(
                    { _id: new ObjectId(hiringId) },
                    { $set: { paymentStatus: "paid", updatedAt: new Date() } }
                );

                // Get updated hiring record details
                const hiringDoc = await hiringCollection.findOne({ _id: new ObjectId(hiringId) });

                // Store in payment collections
                const paymentRecord = {
                    hiringId: new ObjectId(hiringId),
                    clientEmail: hiringDoc.clientEmail,
                    lawyerId: hiringDoc.lawyerId,
                    lawyerName: hiringDoc.lawyerName,
                    amount: hiringDoc.fee,
                    transactionId: transactionId || `TXN-${Date.now()}`,
                    paymentStatus: "paid",
                    paymentType: "hiring_fee",
                    createdAt: new Date(),
                };

                await paymentCollection.insertOne(paymentRecord);
                await bookingPaymentCollection.insertOne(paymentRecord);

                res.status(200).send({ success: true, message: "Payment recorded successfully" });
            } catch (error) {
                console.error("Error processing payment success:", error);
                res.status(500).send({ message: "Failed to process payment" });
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