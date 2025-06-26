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

//Log all entries to make into shorturls
const urlMap = new Map();

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get('/api/shorturl/:short_url', async (req, res)=>{
  const shorturl = parseInt(req.params.short_url);
  
  console.log("shorturl: ", shorturl);
  console.log(urlMap);
  const foundVal = [...urlMap.values()].find(key=>key===shorturl);
  if(foundVal){
    const foundUrl= [...urlMap.entries()].filter(({1: v})=>v===foundVal).map(([k])=>k);
    // console.log(foundUrl);
    if(!foundUrl){
      return res.send('Couldn\'t find URL');
    }
    return res.redirect(foundUrl[0])
  }
  return res.send('Shorturl entry not found');
})

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

  if(!bIsHttp){
    return res.json({error: "Invalid URL"});
  }

  const { hostname } = new URL(url);
  const found = await new Promise((resolve)=>dns.lookup(hostname, (err, address, family)=>{
    if(err){
      console.log("dns lookup err:", err)
      return resolve(false);
    }else{
      resolve(true);
    }
  }))

  if(!found){
    return res.json({error: "Invalid URL"});
  }
  //Create shorturl entry
  let tempShortUrl;
  if(!urlMap.size ){
    urlMap.set(url, 1)
    tempShortUrl = 1;
  }else{
    const short_url = urlMap.get(url);
    tempShortUrl = short_url;
    if(!short_url){
      const lastVal = [...urlMap.values()].at([...urlMap.values()].length - 1);
      // console.log("lastVal: ", lastVal);
      const newVal = lastVal + 1;
      urlMap.set(url, newVal)
      tempShortUrl = newVal;
    }
  }
  
  return res.json({original_url: url, short_url: tempShortUrl});
  
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
