const express = require('express')
const app = express()
const cors = require('cors')
const mongu = require('./mongu.js')
require('dotenv').config()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//1. took me 25 minutes to figure out how to save on new mongoose ver
//2. 40 min to get to step 6
//4. 120 min to get to step 9 whilst fixing error messages with a new info callback parameter
//5. 140 min to get up to 14 "user object" , i'm returning user: {....}. 
  // tried doing res.send() but it doesnt like that either
//6. hours later.. req.body[id broke everything & #8 wanted the user's id. + fixed the date to work exclusively

const User = mongu.UserModel;
const Exercise = mongu.ExerciseModel;
const Log = mongu.LogModel;

const validateDate = (date) => isNaN(Date.parse(date));

app.get('/api/users', (req,res)=>{
  mongu.fetchUsers((err, users)=>{
    if(err){
      console.log("err: ", err);
      return;
    }
    // return res.json({users})
    return res.send((users));
  })
})

app.get('/api/users/:_id/logs', async (req, res)=>{
  console.log("req query: ", req.query);
  const id = req.params._id;
  if(!id){
    return res.json({error: "Invalid User ID"});
  }
  let {from, to, limit} = req.query;
  if(!limit){limit = null;}else{ limit = parseInt(limit)}
  if(validateDate(from)){ from = null} else{ from = Date.parse(from) }
  if(validateDate(to)){ to = null} else{ to = Date.parse(to) }
  console.log("From: ", from, " to: ", to, " limit: ", limit);

  mongu.fetchLogs({id, from, to, limit}, (err, user, info)=>{
    if(err){
      return res.json({error: err});
    }
    if(!user){
      if(info.code === "USER"){
        return res.json({error: "User not found"})
      }
      if(info.code === "LOGS"){
        return res.json({error: "No logs found"});
      }
    }
    // const response = {
    //   id,
    //   username: user.username,
    //   count: user.log.length,
    //   log: user.log
    // };
    res.json(user);
  })
})

app.post('/api/users', (req, res)=>{
  // console.log("body: ", req.body);
  const username = req.body.username;
  let bDelete = true;
  if(!req.body.bDelete || req.body.bDelete === ''){
    bDelete = false;
  }
  if(!username){
    console.error("Invalid Username");
    return res.json({error: "Invalid Username"});
  }
  mongu.createUser(username, async (err, user)=>{
    if(err){
      console.log("err:", err);
      return;
    }
    console.log("user:", user);
    res.json({username: user.username, _id:user._id})
    mongu.createLogEntry({id: user._id, username: user.username}, (err, logUser, info)=>{
      if(err){
        console.error("Failed to create log entry for user");
        return;
      }
    });
    if(bDelete){
      User.findByIdAndDelete(user._id).then(deleted => {
        if (!deleted) {
          console.log('No matching user to delete');
        } else {
          // console.log('Deleted:', deleted);
        }
      })
      .catch(err => {
        console.error('Deletion error:', err);
      });
    }
  });
})

app.post('/api/users/:_id/exercises', (req, res)=> {

  let {description, duration, date} = req.body;
  console.log("req.body: ", req.body)
  if (!description || !duration) {
    return res.json({ error: "Invalid Parameters" });
  }
  
  duration = parseInt(duration, 10);
  console.log("duration: ", duration);
  if(!Number.isInteger(duration)){
    duration = Number(duration);
    if(isNaN(duration)){
      return res.json({error: "Invalid duration"});
    }
  }
  // const id = req.body[':_id']; 1 LINE OF CODE RUINED EVERYTHING AHAHAHAHAHAHHAH
  const id = req.params._id;

  if(!id){
    return res.json({error: "Invalid Id"});
  }
  // console.log("req body: ", req.body);
  console.log("id: ", id);

  if(!date){ 
    const now = new Date()
    date = now.toDateString();
  }else{
    const nan = isNaN(Date.parse(date));
    if(nan){
      return res.json({error: "Invalid Date", message: `${date} is not valid`})
    }else{
      date = new Date(date).toDateString();
    }
  }

  mongu.addExercise({id, description, duration, date}, async (err, exercise, info)=>{
    if (err) {
      console.error("err:", err);
      return res.status(500).json({ error: "Server error" });
    }
    if(!exercise){
      // console.log("info: ", info);
      if(info.code === "USER"){
        return res.json({error: "Invalid User"});
      }
    }
    console.log(exercise);
    
    res.json({
      _id: id,                       
      username: exercise.username,   
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date            
    });
    // await Exercise.findByIdAndDelete(id);
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
