const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
// require('colors');
const config = process.env;

// Mongo DB Connections

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nj7eiar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client
  .connect()
  .then(() => {
    // console.log('MongoDB Connected'.blue.bold);
  })
  .catch(err => {
    console.log(err.red);
  });

// Middleware Connections
const corsConfig = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cookieParser());
app.use(cors(corsConfig));
app.use(express.json());

//middleware for token
const logger = async (req, res, next) => {
  console.log('colled', req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorise' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorise access' });
    }
    console.log('value in the token', decoded);
    req.user = decoded;
    next();
  });
};

// Routes
async function run() {
  try {
    // collections are here
    const database = client.db('CARDOCTOR_DB');
    const servicesCollection = database.collection('SERVICES_COLLECTION');
    const bookingCollection = database.collection('BOOKINGS');

    //auth related api

    // app.post('/jwt', (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: '1h',
    //   });
    //   res.cookie('token', token, {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    //   });
    //   res.send({ success: true });
    // });

    //auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logged out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });
    });

    //for sevice-----------------------------------

    app.get('/services', async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //for update ------

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    //booking

    app.post('/booking', async (req, res) => {
      const newBooking = req.body;

      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    //bookin by use token security

    app.get('/booking', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('token :', req.cookies?.token);
      console.log('user in the valid token', req.user);

      if (req.query?.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // app.get('/booking', async (req, res) => {
    //   let query = {};
    //   console.log('token', req.cookies);
    //   if (req.query?.email) {
    //     query = { email: req.query.email };
    //   }
    //   // console.log(req.query.email);
    //   const cursor = bookingCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // app.put('/coffe/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const option = { upsert: true };
    //   const updatedCoffe = req.body;
    //   const coffe = {
    //     $set: {
    //       name: updatedCoffe.name,
    //       chef: updatedCoffe.chef,
    //       supplier: updatedCoffe.supplier,
    //       taste: updatedCoffe.taste,
    //       category: updatedCoffe.category,
    //       details: updatedCoffe.details,
    //       photo: updatedCoffe.photo,
    //     },
    //   };
    //   const result = await coffeCollection.updateOne(filter, coffe, option);
    //   res.send(result);
    // });

    app.delete('/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    //for user------------------------------------

    // app.post('/user', async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const result = await userCollection.insertOne(user);
    //   res.send(result);
    // });

    app.patch('/booking/:id', async (req, res) => {
      id = req.params.id;
      filter = { _id: new ObjectId(id) };
      const update = req.body;

      const updateDoc = {
        $set: {
          status: update.status,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // app.delete('/user/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await userCollection.deleteOne(query);
    //   res.send(result);
    // });
  } finally {
  }
}
run().catch(console.dir);

// Connection
const PORT = process.env.PORT || 7000;
app.get('/', (req, res) => {
  res.send('YOUR server is live');
});
app.listen(PORT, () => {
  console.log(`App running in port:  ${PORT}`);
});
