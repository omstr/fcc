require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async (req, res)=> {
  
  const body = req.body;
  const url = req.body?.url;
  console.log(body);
  if(!url){
    return res.json({error: "Invalid URL"});
  }

  const prefixes = ["http", "https"]
  const proto = req.protocol;
  console.log(proto);

  const bIsHttp = prefixes.some((p)=>{
    return proto === p
  })

  const { hostname } = new URL(url);
  const found = await new Promise((resolve)=>dns.lookup(hostname, (err, address, family)=>{
    if(err){
      console.log("dns lookup err:", err)
      return resolve(false);
    }else{
      console.log("dns lookup address:", address);
      const isNotLocal = (address !== "127.0.0.1" && address !== "::1");
      resolve(true);
    }
  }))
  console.log("found: ", found);

  if(!bIsHttp || !found){
    return res.json({error: "Invalid URL"});
  }
  
  return res.json({original_url: url, short_url: 1});
  
})
app.get('/api/shorturl/:num', (req, res)=> {
  
  const url = req.query.num;
  
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
