const express = require('express');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const moment = require('moment/moment');
const port = process.env.PORT || 5000;
// This is your test secret API key.
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log(process.env.STRIPE_SECRET_KEY);
app.use(express.static("public"));
app.use(express.json());


// middale ware
app.use(cors())
app.use(express.json())




// const uri = "mongodb+srv://<username>:<password>@cluster0.bkdyuro.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkdyuro.mongodb.net/?retryWrites=true&w=majority`
// console.log({process.env.DB_USER});
// console.log(${process.env.DB_PASS});

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

    const userCollectoin = client.db("srevay").collection("users");
    const paymentCOllectoin = client.db("srevay").collection("payment");
    const servayCollectoin = client.db("srevay").collection("AllServays");
    const pollCollectoin = client.db("srevay").collection("pollCollectoin");
    const commentCollection = client.db("srevay").collection("commentCollection");


    // jwt api 
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "365h" })
      res.send({ token })
    })
    console.log(process.env.ACCESS_TOKEN_SECRET);
    //  middale wares  verify token
    const verifyToken = (req, res, next) => {
      // console.log('inside veryfied token ', req.headers.authorizatoin);
      // next()
      if (!req.headers.authorizatoin) {
        return res.status(401).send({ massage: "forbidden access" })
      }
      const token = req.headers.authorizatoin.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        // console.log("verify", decoded);
        if (err) {
          return res.status(401).send({ massage: "forbiden accsess" })
        }
        req.decoded = decoded
        next()
      })
    }


    // use veryfy admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      console.log("request decoded", req.decoded);
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollectoin.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ massage: 'forbiden accsess ' })
      }
      next()
    }
    const verifyServey = async (req, res, next) => {
      console.log("request decoded", req.decoded);
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollectoin.findOne(query)
      const isServey = user?.role === 'Servey'
      if (!isServey) {
        return res.status(403).send({ massage: 'forbiden accsess ' })
      }
      next()
    }



    //  users relted api

    app.get('/users', async (req, res) => {
      const filter = req.query.filter
      console.log("filtermethod", filter);
      let query = {}
      if (filter) {
        query = { role: filter }
      }
      const result = await userCollectoin.find(query).toArray()
      res.send(result)
    })


    app.post('/users', async (req, res) => {
      const user = req.body

      // insert email if user donent exists :
      // you can do this many ways (1.email unique , 2: upsert 3.simple checking)
      const query = { email: user.email, role: user.role }
      const exsitingUser = await userCollectoin.findOne(query)
      if (exsitingUser) {
        return res.send({ massage: 'user already exists', insertedId: null })
      }
      const result = await userCollectoin.insertOne(user)
      res.send(result)
    })


    // delete admin panel a user 
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollectoin.deleteOne(query)
      res.send(result)
    })



    // check admin 
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollectoin.updateOne(filter, updatedDoc)
      res.send(result)
    })
    // check servay 
    app.patch('/users/Servey/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'Servey'
        }
      }
      const result = await userCollectoin.updateOne(filter, updatedDoc)
      res.send(result)
    })

    /* admin role check admin or normal user  */
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await userCollectoin.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    /* servay role check admin or normal user  */
    app.get('/users/Servey/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await userCollectoin.findOne(query);
      let Servey = false;
      if (user) {
        Servey = user?.role === 'Servey';
      }
      res.send({ Servey });
    })







    //* servay data post get  update  */

    // app.post('/servay', verifyToken, async (req, res) => {
    //   const { _id, ...item } = req.body
    //   const result = await servayCollectoin.insertOne(item)
    //   res.send(result)
    // })

    app.post('/servay', verifyToken, verifyServey, async (req, res) => {
      const { like, dislike, yesVoted, notVoted, status, ...surveyData } = req.body;

      const timestamp = moment().format('MMMM Do YYYY, h:mm:ss a') // Generate timestamp

      const servayIteam = {

        ...surveyData,
        like: like || 0,
        dislike: dislike || 0,
        yesVoted: yesVoted || 0,
        notVoted: notVoted || 0,
        timestamp,
        status: "pending"
      };

      try {
        const result = await servayCollectoin.insertOne(servayIteam);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });


    /* servey like dislike  */

    app.patch('/allSurvey/like/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const { like } = req.body;
        const updatedDoc = {
          $set: {
            like: like

          }
        };
        const result = await servayCollectoin.updateOne(filter, updatedDoc);
        if (result.modifiedCount > 0) {
        }
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).json({ success: false, message: "internal server error" });
      }

    });


    app.patch('/allSurvey/dislike/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const { dislike } = req.body;
        const updatedDoc = {
          $set: {
            dislike: dislike
          }
        };
        const result = await servayCollectoin.updateOne(filter, updatedDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true, modifiedCount: result.modifiedCount });
        } else {
          res.send({ success: false, modifiedCount: 0 });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: "internal server error" });
      }
    });


    //  servay page  data show
    app.get('/servay', async (req, res) => {
      const result = await servayCollectoin.find({ status: "Published", }).toArray()
      // const result = await servayCollectoin.find().toArray()
      res.send(result)
    })
    // servay spesific id data 
    app.get('/servay/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await servayCollectoin.find(query).toArray()
      // const result = await servayCollectoin.find().toArray()
      res.send(result)
    })


    // servay admin data get  page 
    app.get('/servayAdmin', verifyToken, verifyAdmin, async (req, res) => {

      const result = await servayCollectoin.find().toArray()
      res.send(result)
    })


    // admin update servay Unpublised
    // PUT METHOD
    app.put('/servayAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          message: req.body.enteredMessage,
          status: req.body.status,
        },
      }
      const result = await servayCollectoin.updateOne(query, updatedDoc); res.status(200).send(result);
    });

    // pacth Published for data 
    app.patch('/servayAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: req.body.status,
        },
      }
      const result = await servayCollectoin.updateOne(query, updatedDoc);
      res.status(200).send(result);
    });









    /* spesific servay show his servay data  */



    app.get('/myServay', async (req, res) => {
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await servayCollectoin.find(query).toArray()
      res.send(result)
    })


    /* spesific servay data update  route data get */
    app.get('/myServay/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await servayCollectoin.findOne(query)
      res.send(result)
    })

    /* spesifix servay data updated */
    app.patch('/myServay/:id', async (req, res) => {
      const item = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          category: item.category,
          titale: item.titale,
          Descriptoin: item.Descriptoin,
          Dedline: item.Dedline
        }
      }
      const result = await servayCollectoin.updateOne(filter, updatedDoc)
      res.send(result)
    })


    /* payment getWay intent  intent  */
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100); // Convert to cents

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });

        console.log(amount, "amount inside");
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Error creating payment intent:', error.message);
        res.status(500).json({ error: 'Failed to create payment intent' });
      }
    });








    /* payment history */
    app.post('/payments', verifyToken, async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCOllectoin.insertOne(payment);
      console.log("Payment info", payment);
      const userEmail = payment.eamil;
      console.log(userEmail);
      try {
        // Update the users role to Pro User  successful payment
        const filter = { email: userEmail };
        const updateDoc = {
          $set: {
            role: 'Pro User'
          }
        };
        const result = await userCollectoin.updateOne(filter, updateDoc);
        console.log(result);
        res.send(paymentResult);
      } catch (error) {
        console.error('Error updating user role:', error.message);
        res.status(500).json({ error: 'Failed to update user role' });
      }
    });









    /* all users  payment history for admin  */

    app.get('/paymentsHistory', verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCOllectoin.find().toArray()
      res.send(result)
    })





    app.get('/user-data', async (req, res, next) => {
      try {
        const email = req.query.email;

        // Find all documents in pollCollection where the email is included
        const users = await pollCollectoin.find({ email: email }).toArray();

        if (!users || users.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Return the user data
        res.status(200).json(users);
      } catch (error) {
        next(error);
        res.status(500).json({ message: 'Internal Server error' }); // Corrected the closing bracket for json method
      }
    }); // Corrected the closing bracket for the endpoint
          
          
    /* servey comment and */
    app.post('/addComment', async (req, res) => {
      const newComment = req.body
      const id = req.query.id
      const servay = await servayCollectoin.updateOne({ _id: new ObjectId(id) },
        { $inc: { yesVoted: 1 } })
      console.log(id);
      console.log(servay);
      const result = await pollCollectoin.insertOne(newComment)
      res.send(result)
    })

    app.post('/addComments', async (req, res) => {
      const newComments = req.body
      const result = await commentCollection.insertOne(newComments)
      res.send(result)

    })
    app.get('/commentdata', async (req, res) => {
      const result = await commentCollection.find().toArray()
      res.send(result)

    })
    

    /* spesific servay data  */
    // 

    // app.get('/servayvoted', async (req, res) => {
    //   const surveyId = req.body.surveyId;
    //   const result = await pollCollectoin.find(surveyId).toArray()
    //   res.send(result)

    // });

   
    app.get('/servayvoted/:surveyid', async (req, res) => {
      const surveyId = req.params.surveyid;
      console.log(JSON.stringify(surveyId));
      try {
        // Assuming 'userId' is a field in your pollCollection
        const result = await pollCollectoin.find({ surveyId: surveyId }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });







    /* agregrate for response iteam */

    // app.get('/responseItem', async (request, response) => {
    //   const result = await servayCollectoin
    //     .aggregate([
    // { $unwind: { path: '$_id', preserveNullAndEmptyArrays: true } },
    // { $addFields: { testIdString: { $toString: '$_id' } } },
    // {
    //   $lookup: {
    //     from: 'pollCollectoin',
    //     localField: 'testIdString',
    //     foreignField: 'surveyId',
    //     as: 'responseData',
    //   }
    // },
    // { $unwind: '$responseData' },
    // {
    //   $group: {
    //     _id: {
    //       name: "$responseData.name",
    //       email: "$responseData.email",
    //       question: '$responseData.question',
    //       report: '$responseData.report',
    //       surveyId: '$responseData.surveyId'
    //     },

    //     totalvotes: {
    //       $sum: {
    //         $cond: {
    //           if: {
    //             $eq: ['$responseData.vote', 'yes']
    //           },
    //           then: 1,
    //           else: 0,

    //         }
    //       }
    //     }
    //   }
    // },
    // {
    //   $group: {
    //     _id: "null",
    //     totalvotes: { $sum: '$totalvotes' },
    //     details: { $push: "$_id" },
    //   }
    // }

    //     ]).toArray();

    //   const detailInformatoin = result.length > 0 ? result[0].details : [];
    //   const totalVotes = result.length > 0 ? result[0].totalVotes : 0


    //   response.send({ detailInformatoin, totalVotes });
    // })

    // app.get('/responseItem', async (request, response) => {
    //   try {
    //     const results = await servayCollectoin.aggregate([
    //       { $unwind: { path: '$_id', preserveNullAndEmptyArrays: true } },
    //       { $addFields: { testIdString: { $toString: '$_id' } } },
    //       {
    //         $lookup: {
    //           from: 'pollCollectoin',
    //           localField: 'testIdString',
    //           foreignField: 'surveyId',
    //           as: 'responseData',
    //         }
    //       },
    //       { $unwind: '$responseData' },
    //       {
    //         $group: {
    //           // _id: {
    //           //   name: "$responseData.name",
    //           //   email: "$responseData.email",
    //           //   // question: '$responseData.question',
    //           //   report: '$responseData.report',
    //           //   surveyId: '$responseData.surveyId'
    //           // },

    //           totalvotes: {
    //             $sum: {
    //               $cond: {
    //                 if: {
    //                   $eq: ['$responseData.question', 'yes']
    //                 },
    //                 then: 1,
    //                 else: 0,

    //               }
    //             }
    //           }
    //         }
    //       },
    //       {
    //         $group: {
    //           _id: "null",
    //           totalvotes: { $sum: '$totalvotes' },
    //           details: { $push: "$_id" },
    //         }
    //       }
    //     ]).toArray();

    //     // Process the results to extract information
    //     const detailInformation = results.length > 0 ? results[0].details : [];
    //     const totalVotes = results.length > 0 ? results[0].totalVotes : 0;

    //     response.send({ detailInformation, totalVotes });

    //     // Update the servayCollectoin based on the condition
    //     results.forEach(async (result) => {
    //       const { surveyId, totalvotes } = result;
    //       if (totalvotes > 0) {
    //         await servayCollectoin.updateOne(
    //           { _id: surveyId }, // Assuming surveyId is the unique identifier
    //           { $inc: { yesVoted: totalvotes } } // Increment yesVoted by totalvotes
    //         );
    //         console.log(`Updated survey with ID ${surveyId}`);
    //       }
    //     });
    //   } catch (error) {
    //     console.error(`Error in processing /responseItem: ${error}`);
    //     response.status(500).send({ error: 'Internal server error' });
    //   }
    // });











    // app.get('/responseItem', async (request, response) => {
    //   try {
    //     // Aggregating poll collection for total 'yes' votes per survey
    //     const pollResults = await pollCollectoin.aggregate([
    //       {
    //         $group: {
    //           _id: '$surveyId',
    //           totalVotes: {
    //             $sum: {
    //               $cond: {
    //                 if: { $eq: ['$question', 'yes'] },
    //                 then: 1,
    //                 else: 0,
    //               },
    //             },
    //           },
    //         },
    //       },
    //     ]).toArray();

    //     // Extracting survey IDs and total votes from poll results
    //     const surveyIds = pollResults.map((result) => result._id);
    //     const totalVotes = pollResults.reduce((sum, result) => sum + result.totalVotes, 0);

    //     // Sending the total votes per survey and updating servayCollectoin
    //     response.send({ surveyIds, totalVotes });
    //     console.log('hello');
    //     // Updating servayCollectoin based on the 'yes' votes count
    //     // for (const result of pollResults) {
    //     //   const { _id: surveyId, totalVotes } = result;
    //     //   console.log(_id);
    //     //   if (totalVotes > 0) {
    //     //     await servayCollectoin.updateOne(
    //     //       { _id: new ObjectId(surveyId) },
    //     //       { $inc: { yesVoted: 1 } }
    //     //     );
    //     //     console.log(`Updated survey with ID ${surveyId}`);
    //     //   }

    //     // }
    //   } catch (error) {
    //     console.error(`Error in processing /responseItem: ${error}`);
    //     response.status(500).send({ error: 'Internal server error' });
    //   }
    // });





    // ... (remaining code)





    /* agregate for surveyResponse Email  */

    // app.get('/surveyorResponse/:email', async (request, response) => {
    //   const email = request.params.email;
    //   const query = { surveyorEmail: email };
    //   const resultTwo = await servayCollectoin
    //     .aggregate([

    //       {
    //         $match: query,
    //       },
    //       {
    //         $addFields: {
    //           covertString: { $toString: '$_id' },
    //         },
    //       },
    //       {
    //         $lookup: {
    //           from: 'pollCollectoin',
    //           localField: 'covertString',
    //           foreignField: 'surveyId',
    //           as: 'resData',

    //         },
    //       },
    //       {
    //         $unwind: { path: '$resData', preserveNullAndEmptyArrays: true },
    //       },

    //       {
    //         $group: {
    //           _id: {
    //             surveyId: '$resData.surveyId',
    //             name: '$resData.name',
    //             email: '$resData.email',
    //             timestamp: '$resData.timestamp',
    //             totalvotes: {
    //               $sum: {
    //                 $cond: {
    //                   if: { $eq: ['$resData.vote', 'yes'] },
    //                   then: 1,
    //                   else: 0,
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }, {
    //         $group: {
    //           _id: '$_id.surveyId',
    //           totalVotesPerItem: { $sum: '$totalvotes' },
    //           info: { $push: '$_id' },
    //         }
    //       }
    //     ])

    //     .toArray();

    //   response.status(200).send(resultTwo);

    // });










    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// 99tHk2R9LeshkPgl
// Assaignment - 12
app.get('/', (req, res) => {
  res.send('boss is sitting')
})

app.listen(port, () => {
  console.log(`Polling and Survey server is running ${port}`);
})