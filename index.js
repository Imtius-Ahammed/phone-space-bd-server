const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

    //jwt
    app.get('/jwt',async(req, res)=>{
      const email = req.query.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      if(user){
        const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
        return res.send({accessToken: token});

      }

      console.log(user);
      res.status(403).send({accessToken: ''})
    })


  }
  finally{

  }
}
run().catch(console.log);

app.get('/', async(req,res)=>{
  res.send('PhoneSpaceBD server is Running')
})

app.listen(port, () => console.log(`PhoneSpaceBD server is Running on ${port}`))