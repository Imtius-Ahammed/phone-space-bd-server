const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
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
    app.get('/phoneCategories', async(req,res)=>{
      const query = {};
      const options = await phoneCategoriesCollection.find(query).toArray();
      res.send(options);
    })

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
    
    })

   

    //add Orders to database
    app.post('/orders',async(req,res)=>{
      const orders = req.body
      console.log(orders)
      const result = await phoneOrderCollections.insertOne(orders);
      res.send(result);
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

  

   
   
  
  }
  finally{

  }
}
run().catch(console.log);

app.get('/', async(req,res)=>{
  res.send('PhoneSpaceBD server is Running')
})

app.listen(port, () => console.log(`PhoneSpaceBD server is Running on ${port}`))