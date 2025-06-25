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

const User = mongu.UserModel;
const Exercise = mongu.ExerciseModel;
const Log = mongu.LogModel;

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
  console.log("req params: ", req.params);
  const id = req.params._id;
  if(!id){
    return res.json({error: "Invalid User ID"});
  }
  // console.log(id)

  mongu.fetchLogs(id, (err, user, info)=>{
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
    res.send(user);
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

  if(!req.body?.description || !req.body?.duration){
    return res.json({error: "Invalid Parameters"});
  }
  let {description, duration, date} = req.body;
  const id = req.body[':_id'];
  if(!id){
    return res.json({error: "Invalid Id"});
  }
  console.log("req body: ", req.body);
  console.log("id: ", id);

  if(!date){ 
    const now = new Date()
    date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(String(now.getDay()).padStart(2, '0'))}`;
  }else{
    const nan = isNaN(Date.parse(date));
    if(nan){
      return res.json({error: "Invalid Date", message: `${date} is not valid`})
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
    // exercise
    res.json(exercise);
    // await Exercise.findByIdAndDelete(id);
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
