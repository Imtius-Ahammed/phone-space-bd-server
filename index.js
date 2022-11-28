const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

//middleware

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruqflxh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send('unauthorized access');
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next();
  })


}

async function run(){
  try{
    const phoneCategoriesCollection = client.db('phoneSpaceBD').collection('phoneCategories');
    const allPhoneCategory = client.db('phoneSpaceBD').collection('categoryCollections');
    const  phoneOrderCollections= client.db('phoneSpaceBD').collection('phoneOrders');
    const  phoneBuyersCollections= client.db('phoneSpaceBD').collection('buyersCollections');
    const paymentsCollection = client.db('phoneSpaceBD').collection('payments');
   
    


    app.get('/phoneCategories', async(req,res)=>{
      const query = {};
      const options = await phoneCategoriesCollection.find(query).toArray();
      res.send(options);
    });

    app.get('/category/:category_id',async (req,res)=>{
      const category_id = req.params.category_id;
      const query = {category_id: category_id};
      const categoryPhones = await allPhoneCategory.find(query).toArray();
      res.send(categoryPhones)
    });
    //getOrders

    app.get('/orders',verifyJWT,async(req,res)=>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({message: 'forbidden access'});
      }
      const query = {email: email};
      const orders = await phoneOrderCollections.find(query).toArray();
      res.send(orders);
    
    });

   

    //add Orders to database
    app.post('/orders',async(req,res)=>{
      const orders = req.body
      console.log(orders)
      const result = await phoneOrderCollections.insertOne(orders);
      res.send(result);
    });


    //get single order

    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orders = await phoneOrderCollections.findOne(query);
      res.send(orders);
  })









    //payment
    
    app.post('/create-payment-intent', async (req, res) => {
      const orders = req.body;
      const price = orders.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          "payment_method_types": [
              "card"
          ]
      });
      res.send({
          clientSecret: paymentIntent.client_secret,
      });
  }); 

  app.post('/payments', async (req, res) =>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.ordersId
      const filter = {_id: ObjectId(id)}
      const updatedDoc = {
          $set: {
              paid: true,
              transactionId: payment.transactionId
          }
      }
      const updatedResult = await phoneOrderCollections.updateOne(filter, updatedDoc)
      res.send(updatedResult);
  })
















    



    //jwt
    app.get('/jwt',async(req, res)=>{
      const email = req.query.email;
      const query = {email: email};
      const user = await phoneBuyersCollections.findOne(query);
      if(user){
        const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
        return res.send({accessToken: token});

      }

      console.log(user);
      res.status(403).send({accessToken: ''})
    })


  //get buyers
   app.get('/buyers',async(req,res)=>{
    const query = {};
    const buyers = await phoneBuyersCollections.find(query).toArray();
    res.send(buyers);
   })
    //add buyers to database

    app.post('/buyers',async(req,res)=>{
      const buyer = req.body;
      const result = await phoneBuyersCollections.insertOne(buyer);
      res.send(result);
    })

    //verify seller
    app.put('/buyers/admin/:id',verifyJWT,async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: ObjectId(id)}
      const options = {upsert: true};
      const updatedDoc = {
        $set: {
          sellerStatus: 'verified'
        }
      }
      const result = await phoneBuyersCollections.updateOne(filter,updatedDoc,options);
      res.send(result);
    })


    //check admin
    app.get('/buyers/admin/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email}
      const user = await phoneBuyersCollections.findOne(query);
      res.send({isAdmin: user?.role === "admin"});
    })


     //get findOne buyer
    app.get('/buyers/buyer/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email}
      const user = await phoneBuyersCollections.findOne(query);
      res.send({isBuyer: user?.role === "buyer"});
    })


   //get one seller
    app.get('/buyers/seller/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email}
      const user = await phoneBuyersCollections.findOne(query);
      res.send({isSeller: user?.role === "seller"});
    }) 


       //get all buyer and seller
       app.get('/buyers/:role',async (req,res)=>{
        const role = req.params.role;
        const query = {role: role};
        const allbuyer = await phoneBuyersCollections.find(query).toArray();
        res.send(allbuyer);
      });

      //delete Operations

      app.delete('/buyers/:id',verifyJWT, async(req,res)=>{
        const id = req.params.id;
        const filter = {
          _id: ObjectId(id)
        };
        const result = await phoneBuyersCollections.deleteOne(filter);
        res.send(result);
      })
     


     //get product
      app.get("/addproduct", async (req, res) => {
        const query = {};
        const cursor = allPhoneCategory.find(query);
        const services = await cursor.toArray();
        res.send(services);
      });


      //product add

      app.post("/addproduct", verifyJWT, async (req, res) => {
        const postProduct = req.body;
        const result = await allPhoneCategory.insertOne(postProduct);
        res.send(result);
      });
   



      //filter the seller products

      app.get("/addproduct/:seller_role", async (req, res) => {
        const seller_role = req.params.seller_role;
        const query = {seller_role:seller_role};
        const cursor = allPhoneCategory.find(query);
        const sellerProducts = await cursor.toArray();
        res.send(sellerProducts);
      });
    
 


      //delete Product

      app.delete('/addproduct/:id',verifyJWT, async(req,res)=>{
        const id = req.params.id;
        const filter = {
          _id: ObjectId(id)
        };
        const result = await allPhoneCategory.deleteOne(filter);
        res.send(result);
      })

    
  //advertise item verify

  app.put('/addproduct/seller/:id',verifyJWT,async(req,res)=>{
    const id = req.params.id;
    const filter = {_id: ObjectId(id)}
    const options = {upsert: true};
    const updatedDoc = {
      $set: {
        advertiseStatus: 'advertised'
      }
    }
    const result = await allPhoneCategory.updateOne(filter,updatedDoc,options);
    res.send(result);
  })


  // get advertise items
  app.get("/addproduct/seller/:advertiseStatus", async (req, res) => {
    const advertiseStatus = req.params.advertiseStatus;
    const query = {advertiseStatus:advertiseStatus};
    const cursor = allPhoneCategory.find(query);
    const sellerProducts = await cursor.toArray();
    res.send(sellerProducts);
  });

  

   
   
  
  }
  finally{

  }
}
run().catch(console.log);

app.get('/', async(req,res)=>{
  res.send('PhoneSpaceBD server is Running')
})

app.listen(port, () => console.log(`PhoneSpaceBD server is Running on ${port}`))