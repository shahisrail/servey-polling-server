const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const moment = require('moment/moment');
const port = process.env.PORT || 5000;

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
    const servayCollectoin = client.db("srevay").collection("AllServays");

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

    app.post('/servay', verifyToken, async (req, res) => {
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
    //  servay page  data show
    app.get('/servay', async (req, res) => {
      const result = await servayCollectoin.find({ status: "Published" }).toArray()
      // const result = await servayCollectoin.find().toArray()
      res.send(result)
    })


    // servay admin data get  page 
    app.get('/servayAdmin', async (req, res) => {

      const result = await servayCollectoin.find().toArray()
      res.send(result)
    })


    // admin update servay Unpublised
    // PUT METHOD
    app.put('/servayAdmin/:id', verifyToken, async (req, res) =>{
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
    app.patch('/servayAdmin/:id', verifyToken, async (req, res) => {
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