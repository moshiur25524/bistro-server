require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oesiy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("BistroDB").collection("users");
    const menuCollection = client.db("BistroDB").collection("menu");
    const reviewsCollection = client.db("BistroDB").collection("reviews");
    const cartCollection = client.db("BistroDB").collection("carts");
    const paymentCollection = client.db("BistroDB").collection("payments");
    const bookingCollection = client.db("BistroDB").collection("bookings");
    const contactCollection = client.db("BistroDB").collection("contacts");

    // Sign a jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // warning: use verifyJWT before useing verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };

      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden message" });
      }
      next();
    };

    /*
    1. don't show secure links to those who shouldn't see the links
    2. use jwt token: verifyJwt()
    3. use VerifyAdmin middleware
    */

    // user related api

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send("The user is logged in");
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //Admin API
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const user = await usersCollection.findOne({ email: email });
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/admin-stats", async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const products = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const payments = await paymentCollection.find({}).toArray();
      const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);

      const fixedrevenue = revenue.toFixed(2);
      res.send({
        users,
        products,
        orders,
        fixedrevenue,
      });
    });

    app.get("/home-stats", async (req, res) => {
      try {
        const { email } = req.query;
        const orders = await paymentCollection.find({ email: email }).toArray();
        const reviews = await reviewsCollection
          .find({ email: email })
          .toArray();
        const contacts = await contactCollection
          .find({ email: email })
          .toArray();
        const carts = await cartCollection.find({ email: email }).toArray();
        const bookings = await bookingCollection
          .find({ email: email })
          .toArray();
        const payments = await paymentCollection
          .find({ email: email })
          .toArray();
        const ordersCount = orders.length;
        const reviewsCount = reviews.length;
        const contactCount = contacts.length;
        const bookingsCount = bookings.length;
        const paymentsCount = payments.length;
        const cartsCount = carts.length;

        res.send({
          ordersCount,
          reviewsCount,
          bookingsCount,
          paymentsCount,
          contactCount,
          cartsCount,
        });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.get("/order-stats", async (req, res) => {
      try {
        const pipeline = [
          {
            $lookup: {
              from: "menu",
              localField: "menuItems",
              foreignField: "_id",
              as: "menuItemsData",
            },
          },
          {
            $unwind: "$menuItemsData",
          },
          {
            $group: {
              _id: "$menuItemsData.category",
              count: { $sum: 1 },
              totalPrice: { $sum: "$menuItemsData.price" },
            },
          },
        ];

        const result = await paymentCollection.aggregate(pipeline).toArray();

        if (result.length === 0) {
          return res.status(404).json({ message: "No data found" });
        }

        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // menu related api
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    });

    app.delete("/menu/:id", async (req, res) => {
      const { id } = req.params;
      const result = await menuCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // review related api
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // carts collection apis
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send("Forbidden access");
      }

      const result = await cartCollection.find({ email }).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      console.log(result);
      res.send(result);
    });

    app.get("/payment", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const payments = await paymentCollection.find({}).toArray();
      const result = payments.filter((payment) => payment?.email === email);
      res.status(200).json({
        status: "Success",
        data: result,
      });
    });

    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find({}).toArray();
      res.send(result);
    });

    // step 7: created the payment api
    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deletedResult = await cartCollection.deleteMany(query);
      res.send({ insertResult, deletedResult });
    });

    // step 7: created the payment intent api for payment

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/bookings", async (req, res) => {
      const result = await bookingCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/booking", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send("Forbidden Access");
      // }

      const result = await bookingCollection.find({ email }).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // TODO: have to create put api for booking endpoint
    app.put("bookings/:id", async (req, res) => {
      const { id } = req.params;
      const filter = {};
    });

    app.delete("/bookings/:id", async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(id),
      });
      console.log(result);
      res.send(result);
    });

    app.get("/contacts", async (req, res) => {
      try {
        const result = await contactCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    app.post("/contact", async (req, res) => {
      try {
        const data = req.body;
        const result = await contactCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });

    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Boss is sitting");
});

app.listen(port, () => {
  console.log(`You are listening from port ${port}`);
});

/*
    -----------------------------
    Naming convention
    --------------------------
    users: UserCollection
    
    app.get('/users')
    app.get('/users/:id')
    app.post('/users)
    app.patch('/users/:id')
    app.put('/users/:id')
    app.delete('/users/:id')
    */
