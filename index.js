const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const moment = require('moment/moment');
const port = process.env.PORT || 5000;
// This is your test secret API key.
const stripe = require("stripe")('sk_test_51OEuuJKc6cWjkGN6wac43QFhEVjHVFMsyAYKltjlSA46ShnBVWz9Z3bsrxuZ9B6KWblR3cxO0aeeWRhO4ZES0X2E00sG3FUQ29');
app.use(express.static("public"));
app.use(express.json());


// middale ware
app.use(cors())
app.use(express.json())






const uri = "mongodb+srv://Assaignment-12:99tHk2R9LeshkPgl@cluster0.bkdyuro.mongodb.net/?retryWrites=true&w=majority";

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
    const commentCollection = client.db("srevay").collection("commentCollection");


    // jwt api 
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, "d547bc644dfb8fa06eb6a24690665052c47aaaf0986f667542dc78208cedfe1334cabd2200107ad7923846a499535a4bdfcd6b1d1cb4dace3e17a22147f6b899", { expiresIn: "365h" })
      res.send({ token })
    })

    //  middale wares  verify token
    const verifyToken = (req, res, next) => {
      // console.log('inside veryfied token ', req.headers.authorizatoin);
      // next()
      if (!req.headers.authorizatoin) {
        return res.status(401).send({ massage: "forbidden access" })
      }
      const token = req.headers.authorizatoin.split(' ')[1]
      jwt.verify(token, "d547bc644dfb8fa06eb6a24690665052c47aaaf0986f667542dc78208cedfe1334cabd2200107ad7923846a499535a4bdfcd6b1d1cb4dace3e17a22147f6b899", (err, decoded) => {
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

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollectoin.find().toArray()
      res.send(result)
    })


    app.post('/users', async (req, res) => {
      const user = req.body
      // insert email if user donent exists :
      // you can do this many ways (1.email unique , 2: upsert 3.simple checking)
      const query = { email: user.email }
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
    app.post('/payments', async (req, res) => {
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






    /* servey comment and */
    app.post('/addComment', async (req, res) => {
      const newComment = req.body
      const result = await commentCollection.insertOne(newComment)
      res.send(result)
    })










    /* agregrate for response iteam */

    app.get('/responseItem', async (request, response) => {
      const result = await surveyCollection
        .aggregate([
          { $unwind: '$testId' },
          {
            $lookup: {
              from: 'visitedSurvey',
              localField: 'testId',
              foreignField: 'surveyItemId',
              as: 'responseData',
            }
          },
          { $unwind: '$responseData' },
          {
            $group: {
              _id: {
                userName: '$responseData.userName',
                userEmail: '$responseData.userEmail',
                timestamp: '$responseData.timestamp'
              },
              totalYesVotes: {
                $sum: {
                  $cond: {
                    if: { $eq: ['$responseData.vote', 'yes'] },
                    then: 1,
                    else: 0,
                  }
                }
              }
            }
          },
          {

            $group: {
              _id: null,
              totalYesVotes: { $sum: '$totalYesVotes' },
              details: { $push: '$_id' },

            },
          },

        ]).toArray();
      const detailedInformation = result.length > 0 ? result[0].details : [];
      const totalYesVotes = result.length > 0 ? result[0].totalYesVotes : 0;
      response.status(200).send({ detailedInformation, totalYesVotes });
    })






    /* agregate for surveyResponse Email  */

    app.get('/surveyorResponse/:email', async (request, response) => {
      const email = request.params.email;
      const query = { surveyorEmail: email };
      const resultTwo = await surveyCollection
        .aggregate([

          {
            $match: query,
          },
          {
            $addFields: {
              covertString: { $toString: '$_id' },
            },
          },
          {
            $lookup: {
              from: 'visitedSurvey',
              localField: 'covertString',
              foreignField: 'surveyItemId',
              as: 'resData',

            },
          },
          {
            $unwind: { path: '$resData', preserveNullAndEmptyArrays: true },
          },

          {
            $group: {
              _id: {
                surveyItemId: '$resData.surveyItemId',
                userName: '$resData.userName',
                userEmail: '$resData.userEmail',
                timestamp: '$resData.timestamp',
                totalVotes: {
                  $sum: {
                    $cond: {
                      if: { $eq: ['$resData.vote', 'yes'] },
                      then: 1,
                      else: 0,
                    }
                  }
                }
              }
            }
          }, {
            $group: {
              _id: '$_id.surveyItemId',
              totalVotesPerItem: { $sum: '$totalVotes' },
              info: { $push: '$_id' },
            }
          }
        ])

        .toArray();

      response.status(200).send(resultTwo);

    });










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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