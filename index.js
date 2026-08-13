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
        const paymentCollection = db.collection('payment');
        const bookingCollection = db.collection('booking');
        const bookingPaymentCollection = db.collection('booking-payment');
        const commentsCollection = db.collection('comments');
        const transactionsCollection = db.collection('transactions');
        const servicesCollection = db.collection('services');





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



        // 4. POST API for Lawyer Hiring Payment

        // app.post('/api/lawyers/booking-payment', async (req, res) => {
        //     try {
        //         const {
        //             bookingId,
        //             amount,
        //             lawyerId,
        //             lawyerName,
        //             paymentStatus,
        //             email,
        //             paymentType,
        //             transactionId
        //         } = req.body;

        //         // 1. Check if payment already exists (Idempotency check)
        //         const isBookingExist = await bookingPaymentCollection.findOne({ transactionId });
        //         if (isBookingExist) {
        //             // Return 200 so Next.js res.ok is true on page reloads/re-syncs
        //             return res.status(200).json({
        //                 success: true,
        //                 message: "Already Paid!",
        //                 result: isBookingExist
        //             });
        //         }

        //         // 2. Prepare and insert main booking data
        //         const bookingData = {
        //             bookingId: bookingId || null,
        //             lawyerId: lawyerId || null,
        //             lawyerName: lawyerName || "Attorney",
        //             amount: Number(amount) || 0,
        //             clientEmail: email,
        //             paymentType: paymentType || "booking",
        //             transactionId,
        //             paymentStatus: paymentStatus || "paid",
        //             bookingDate: new Date(),
        //         };

        //         const bookingRes = await bookingCollection.insertOne(bookingData);

        //         // 3. Insert payment log into booking payment collection
        //         const bookingPaymentData = {
        //             bookingId: bookingId || null,
        //             clientEmail: email,
        //             lawyerName: lawyerName || "Attorney",
        //             amount: Number(amount) || 0,
        //             transactionId,
        //             paymentStatus: paymentStatus || "paid",
        //             paymentType: paymentType || "booking",
        //             paidAt: new Date()
        //         };
        //         await bookingPaymentCollection.insertOne(bookingPaymentData);

        //         // 4. Safely update original hiring request in MongoDB
        //         if (bookingId && ObjectId.isValid(bookingId)) {
        //             const updateResult = await hiringCollection.updateOne(
        //                 { _id: new ObjectId(bookingId) },
        //                 {
        //                     $set: {
        //                         paymentStatus: paymentStatus || 'paid',
        //                         status: 'accepted',
        //                         transactionId: transactionId
        //                     }
        //                 }
        //             );
        //             console.log(`Hiring document (${bookingId}) updated successfully:`, updateResult.modifiedCount);
        //         } else {
        //             console.warn("Skipped hiringCollection update: Invalid or missing bookingId:", bookingId);
        //         }

        //         return res.status(200).json({
        //             success: true,
        //             message: "Payment recorded successfully",
        //             result: bookingRes
        //         });

        //     } catch (error) {
        //         console.error("Error saving payment verification:", error);
        //         return res.status(500).json({
        //             success: false,
        //             message: "Failed to save payment verification",
        //             error: error.message
        //         });
        //     }
        // });


        app.post('/api/lawyers/booking-payment', async (req, res) => {
            try {
                const {
                    bookingId,
                    amount,
                    lawyerId,
                    lawyerName,
                    paymentStatus,
                    email,
                    lawyerEmail,
                    paymentType,
                    transactionId
                } = req.body;

                if (!transactionId) {
                    return res.status(400).json({
                        success: false,
                        message: "Transaction ID is required."
                    });
                }

                // 1. Idempotency Check (Prevent duplicate entries)
                const isTxExist = await transactionsCollection.findOne({ transactionId });
                if (isTxExist) {
                    return res.status(200).json({
                        success: true,
                        message: "Transaction already exists!",
                        result: isTxExist
                    });
                }

                // 2. Resolve missing Lawyer details if only lawyerId is present
                let resolvedLawyerEmail = lawyerEmail || null;
                let resolvedLawyerName = lawyerName || "Attorney";

                if (lawyerId && ObjectId.isValid(lawyerId)) {
                    const lawyerProfile = await lawyerCollection.findOne({ _id: new ObjectId(lawyerId) });
                    if (lawyerProfile) {
                        if (!resolvedLawyerEmail) {
                            resolvedLawyerEmail = lawyerProfile.email || lawyerProfile.userId || null;
                        }
                        if (!lawyerName || lawyerName === "Attorney") {
                            resolvedLawyerName = lawyerProfile.name || lawyerProfile.fullName || "Attorney";
                        }
                    }
                }

                const now = new Date();
                const parsedBookingId = (bookingId && ObjectId.isValid(bookingId)) ? new ObjectId(bookingId) : (bookingId || null);

                // 3. Prepare unified payloads for all collections
                const transactionRecord = {
                    transactionId,
                    bookingId: parsedBookingId,
                    clientEmail: email || null,
                    lawyerId: lawyerId || null,
                    lawyerName: resolvedLawyerName,
                    lawyerEmail: resolvedLawyerEmail,
                    amount: Number(amount) || 0,
                    paymentType: paymentType || "booking",
                    paymentStatus: paymentStatus || "paid",
                    createdAt: now,
                };

                const bookingData = {
                    bookingId: parsedBookingId,
                    lawyerId: lawyerId || null,
                    lawyerName: resolvedLawyerName,
                    lawyerEmail: resolvedLawyerEmail,
                    amount: Number(amount) || 0,
                    clientEmail: email || null,
                    paymentType: paymentType || "booking",
                    transactionId,
                    paymentStatus: paymentStatus || "paid",
                    bookingDate: now,
                };

                const bookingPaymentData = {
                    bookingId: parsedBookingId,
                    lawyerId: lawyerId || null,
                    lawyerName: resolvedLawyerName,
                    lawyerEmail: resolvedLawyerEmail,
                    clientEmail: email || null,
                    amount: Number(amount) || 0,
                    transactionId,
                    paymentStatus: paymentStatus || "paid",
                    paymentType: paymentType || "booking",
                    paidAt: now
                };

                // 4. Insert synchronized records across all 3 collections
                const txResult = await transactionsCollection.insertOne(transactionRecord);
                await bookingCollection.insertOne(bookingData);
                await bookingPaymentCollection.insertOne(bookingPaymentData);

                // 5. Update original hiring request status
                if (bookingId && ObjectId.isValid(bookingId)) {
                    await hiringCollection.updateOne(
                        { _id: new ObjectId(bookingId) },
                        {
                            $set: {
                                paymentStatus: paymentStatus || 'paid',
                                status: 'accepted',
                                transactionId: transactionId,
                                updatedAt: now
                            }
                        }
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: "Payment and booking recorded successfully across all collections.",
                    result: txResult
                });

            } catch (error) {
                console.error("Error saving payment verification:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to record payment",
                    error: error.message
                });
            }
        });


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



        // ============== PAYMENT ROUTES ==============



        // 1. GET Transactions for Client Dashboard

        app.get('/api/client/transactions', async (req, res) => {
            try {
                // Support both ?email= and ?clientEmail= query parameters
                const email = req.query.email || req.query.clientEmail;

                if (!email) {
                    return res.status(400).json({ error: "Email query parameter is required" });
                }

                // Clean up the email string
                const cleanEmail = email.trim();

                // Case-insensitive query so casing differences won't break the search
                const query = {
                    clientEmail: { $regex: new RegExp(`^${cleanEmail}$`, 'i') }
                };

                const transactions = await transactionsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                return res.status(200).json(transactions);
            } catch (error) {
                console.error("Error fetching client transactions:", error);
                return res.status(500).json({ error: "Failed to fetch client transactions" });
            }
        });


        // 2. GET Transactions for Lawyer Dashboard

        app.get('/api/lawyer/transactions', async (req, res) => {
            try {
                const { lawyerId, email } = req.query;

                let query = {};

                if (lawyerId) {
                    // Build matching conditions for string, ObjectId, or fallback stored ID inside lawyerEmail
                    const idConditions = [
                        { lawyerId: lawyerId },
                        { lawyerEmail: lawyerId } // Fallback if lawyerId was stored inside lawyerEmail field
                    ];

                    if (ObjectId.isValid(lawyerId)) {
                        idConditions.push({ lawyerId: new ObjectId(lawyerId) });
                    }

                    query.$or = idConditions;
                } else if (email) {
                    query.lawyerEmail = email.trim().toLowerCase();
                } else {
                    return res.status(400).json({ error: "lawyerId or email is required" });
                }

                const transactions = await transactionsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.status(200).json(transactions);
            } catch (error) {
                console.error("Error fetching lawyer transactions:", error);
                res.status(500).json({ error: "Failed to fetch lawyer transactions" });
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

        // app.get('/api/lawyer/hiring-requests/:lawyerId', async (req, res) => {
        //     try {
        //         const { lawyerId } = req.params;
        //         const { email } = req.query; // Query param fallback

        //         const queryConditions = [];

        //         if (email) {
        //             queryConditions.push({ lawyerEmail: email });
        //         }

        //         if (lawyerId && lawyerId !== "undefined") {
        //             queryConditions.push({ lawyerId: lawyerId });
        //             if (ObjectId.isValid(lawyerId)) {
        //                 queryConditions.push({ lawyerId: new ObjectId(lawyerId) });
        //             }
        //         }

        //         const query = queryConditions.length > 0 ? { $or: queryConditions } : {};

        //         const requests = await hiringCollection
        //             .find(query)
        //             .sort({ createdAt: -1 })
        //             .toArray();

        //         res.status(200).send(requests);
        //     } catch (error) {
        //         console.error("Error fetching lawyer requests:", error);
        //         res.status(500).send({ message: "Failed to fetch requests" });
        //     }
        // });


        // 4. Fetch Lawyer's Incoming Requests

        app.get('/api/lawyer/hiring-requests/:lawyerId', async (req, res) => {
            try {
                const { lawyerId } = req.params;

                if (!lawyerId || lawyerId === "undefined") {
                    return res.status(400).send({ message: "Valid Lawyer ID is required" });
                }

                // 1. Find the lawyer profile from 'lawyersCollection' using the userId

                const lawyerProfile = await lawyerCollection.findOne({
                    $or: [
                        { userId: lawyerId },
                        ...(ObjectId.isValid(lawyerId) ? [{ _id: new ObjectId(lawyerId) }] : [])
                    ]
                });

                // 2. Build list of potential IDs to query in hiringCollection

                const targetIds = [];

                if (lawyerProfile) {
                    targetIds.push(lawyerProfile._id);
                    targetIds.push(lawyerProfile._id.toString());
                }

                // Fallback: Also add the raw parameter ID (as string and ObjectId)

                targetIds.push(lawyerId);
                if (ObjectId.isValid(lawyerId)) {
                    targetIds.push(new ObjectId(lawyerId));
                }

                // 3. Query hiringCollection using $in operator
                const requests = await hiringCollection
                    .find({ lawyerId: { $in: targetIds } })
                    .sort({ createdAt: -1 })
                    .toArray();

                return res.status(200).send(requests);

            } catch (error) {
                console.error("Error fetching lawyer requests:", error);
                return res.status(500).send({ message: "Failed to fetch requests", error: error.message });
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




        // ========== CLIENT PROFILE RELATED API ===========


        // 1. GET Client Profile Data

        app.get('/api/client/profile', async (req, res) => {
            try {
                const email = req.query.email || req.query.clientEmail;
                if (!email) {
                    return res.status(400).json({ error: "Email query parameter is required" });
                }

                const client = await clientsCollection.findOne({
                    email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
                });

                if (!client) {
                    return res.status(404).json({ error: "Client profile not found" });
                }

                return res.status(200).json(client);
            } catch (error) {
                console.error("Error fetching client profile:", error);
                return res.status(500).json({ error: "Failed to fetch profile" });
            }
        });


        // 2. PATCH Update Client Profile Data

        app.patch('/api/client/profile', async (req, res) => {
            try {
                const email = req.query.email || req.query.clientEmail;
                if (!email) {
                    return res.status(400).json({ error: "Email query parameter is required" });
                }

                const updateData = req.body;

                // Remove _id from update payload if present
                delete updateData._id;

                const result = await clientsCollection.updateOne(
                    { email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } },
                    { $set: { ...updateData, updatedAt: new Date() } },
                    { upsert: true }
                );

                return res.status(200).json({
                    message: "Profile updated successfully",
                    result
                });
            } catch (error) {
                console.error("Error updating client profile:", error);
                return res.status(500).json({ error: "Failed to update profile" });
            }
        });


        // 3. DELETE Client Profile Information

        app.delete('/api/client/profile', async (req, res) => {
            try {
                const email = req.query.email || req.query.clientEmail;
                if (!email) {
                    return res.status(400).json({ error: "Email query parameter is required" });
                }

                // Resets/clears optional profile fields while keeping basic record intact
                const resetFields = {
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    phone: '',
                    bio: '',
                    imageUrl: '',
                    updatedAt: new Date()
                };

                const result = await clientsCollection.updateOne(
                    { email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } },
                    { $set: resetFields }
                );

                return res.status(200).json({
                    message: "Profile details cleared successfully",
                    result
                });
            } catch (error) {
                console.error("Error clearing client profile:", error);
                return res.status(500).json({ error: "Failed to delete profile information" });
            }
        });



        // ========= COMMENTS ROUTE/API ==========



        // 1. GET: Fetch Comments (Filter by lawyerId OR clientEmail)


        app.get('/api/comments', async (req, res) => {
            try {
                const { lawyerId, clientEmail } = req.query;
                let query = {};

                if (lawyerId) query.lawyerId = lawyerId;
                if (clientEmail) query.clientEmail = clientEmail;

                const comments = await commentsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.status(200).json(comments);
            } catch (error) {
                console.error("Error fetching comments:", error);
                res.status(500).json({ error: "Failed to fetch comments" });
            }
        });



        // 2. GET: Check if Client has Paid/Hired the Specific Lawyer


        app.get('/api/check-payment', async (req, res) => {
            try {
                const { clientEmail, lawyerId } = req.query;

                if (!clientEmail || !lawyerId) {
                    return res.status(400).json({
                        hasPaid: false,
                        message: "Missing clientEmail or lawyerId"
                    });
                }

                // Search bookingCollection (or bookingPaymentCollection) matching your schema
                const booking = await bookingCollection.findOne({
                    clientEmail: clientEmail,
                    lawyerId: lawyerId,
                    paymentStatus: "paid"
                });

                res.status(200).json({ hasPaid: !!booking });
            } catch (error) {
                console.error("Error checking payment status:", error);
                res.status(500).json({ hasPaid: false });
            }
        });



        // 3. POST: Create a New Comment


        app.post('/api/comments', async (req, res) => {
            try {
                const { lawyerId, lawyerName, clientEmail, clientName, commentText, rating } = req.body;

                // Verify that this client has a paid booking with this lawyer
                const isHired = await bookingCollection.findOne({
                    clientEmail: clientEmail,
                    lawyerId: lawyerId,
                    paymentStatus: "paid"
                });

                if (!isHired) {
                    return res.status(403).json({ message: "You have to Pay/Hire first" });
                }

                const newComment = {
                    lawyerId,
                    lawyerName,
                    clientEmail,
                    clientName,
                    commentText,
                    rating: Number(rating),
                    createdAt: new Date()
                };

                const result = await commentsCollection.insertOne(newComment);
                res.status(201).json({ ...newComment, _id: result.insertedId });
            } catch (error) {
                console.error("Error creating comment:", error);
                res.status(500).json({ error: "Failed to post comment" });
            }
        });


        // 4. PATCH: Update Comment in Client Dashboard


        app.patch('/api/comments/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { commentText, rating } = req.body;

                const updateFields = {
                    updatedAt: new Date()
                };

                if (commentText !== undefined) updateFields.commentText = commentText;
                if (rating !== undefined) updateFields.rating = Number(rating);

                const result = await commentsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateFields }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "Comment not found" });
                }

                res.status(200).json({ message: "Comment updated successfully", result });
            } catch (error) {
                console.error("Error updating comment:", error);
                res.status(500).json({ error: "Failed to update comment" });
            }
        });


        // 5. DELETE: Delete Comment in Client Dashboard


        app.delete('/api/comments/:id', async (req, res) => {
            try {
                const { id } = req.params;

                const result = await commentsCollection.deleteOne({
                    _id: new ObjectId(id)
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Comment not found" });
                }

                res.status(200).json({ message: "Comment deleted successfully", result });
            } catch (error) {
                console.error("Error deleting comment:", error);
                res.status(500).json({ error: "Failed to delete comment" });
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