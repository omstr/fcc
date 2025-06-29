require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)

const exerciseSchema = new mongoose.Schema({
    username: {
        type: String
    },
    description: {
        type: String
    },
    duration: {
        type: Number
    },
    date: {
        type: String,
        default: (new Date).toDateString()
    }
}, {versionKey: false})

const exerciseLogSchema = new mongoose.Schema({
    description: {
        type: String
    },
    duration: {
        type: Number
    },
    date: {
        type: String,
        default: (new Date).toDateString()
    },
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: {
        type: String
    },
    // _id: {
    //     type: String
    // }
}, {versionKey: false})
const logSchema = new mongoose.Schema({
    _id: {
        type: String
    },
    username: {
        type: String
    },
    count: {
        type: Number
    },
    log: {
        type: [exerciseLogSchema]
    },
}, {versionKey: false})

let Exercise = mongoose.model("Exercise", exerciseSchema);
let ExerciseLog = mongoose.model("ExerciseLog", exerciseLogSchema);
let User = mongoose.model("User", userSchema);
let Log = mongoose.model("Log", logSchema);

const createUser = async (username, done) => {
    let user = new User({
        username
    })

    user = await user.save()
    // console.log("createUser | saved user: ", user);
    if(!user){
        done(err);
        return;
    }
    done(null, user);
    // user.save((err, data)=>{
    //     if(err){
    //         done(err);
    //         return;
    //     }
    //     done(null, data);
    // })
}
const fetchUsers = async (done) => {
    const users = await User.find({})

    if(!users){
        done(err);
        return;
    }
    done(null, users);
}

const createLogEntry = async ({id, username}, done) => {
    const logUser = await Log.findById(id).exec();
    // console.log("logUser: ", logUser);
    if(logUser){
        done(null, logUser);
    }

    const log = new Log({
        username,
        count: 0,
        log: [],
        _id: id
    })   
    const logSave = await log.save();
    if(!logSave){
        console.error("Failed saving log: ", logSave);
        return done(logSave);
    }
    return done(null, logSave);

}
const pushLogEntry = async ({id, username, description, duration, date}, done) => {
    const exerciseLog = new ExerciseLog({
        description,
        duration,
        date,
    })

    const logUser = await Log.findById(id).exec();
    console.log("logUser: ", logUser);

    if(!logUser){
        const log = new Log({
            username,
            count: 1,
            log: [exerciseLog],
            _id: id
        })   
        const logSave = await log.save();
        if(!logSave){
            console.error("Failed saving log: ", logSave);
            done(logSave);
            return;
        }
        return done(null, logSave);
    }

    logUser.log.push(exerciseLog);
    logUser.count = logUser.log.length;
    console.log("logUser new log length: ", logUser.log?.length);
    await logUser.save();
    
    return done(null, logUser);
}

const addExercise = async ({id, description, duration, date}, done) => {
    let username;
    const user = await User.findById(id).exec();

    if(!user){
        done(null, false, {code: "USER"});
        return;
    }

    username = user.username;
    const exercise = new Exercise({
        username,
        description,
        duration,
        date,
        // _id: id
    })
    
    pushLogEntry({ id, username, description, duration, date }, async (err, updatedLog) => {
        if (err) return done(null, false, {code: "LOGS"});
        const saved = await exercise.save();
        if(!saved){
            done(saved);
            return;
        }
        done(null, saved);
    });
}

const fetchLogs = async ({id, from, to, limit}, done) => {
    const user = await Log.findById(id).exec();
    if(!user){
        return done(null, false, {code: "USER"})
    }
    
    let allLogs = user.log;

    if (from) {
        allLogs = allLogs.filter(e => new Date(e.date) >= new Date(from));
    }
    if (to) {
        allLogs = allLogs.filter(e => new Date(e.date) <= new Date(to))
    };

    if (limit) {
        allLogs = allLogs.slice(0, parseInt(limit))
    };

    const log = allLogs.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date
    }));
    // let filteredLogs = []
    //         return date >= from && date <= to
   

    const obj = {_id: id, username: user.username, count: user.count, log}
    done(null, obj);
}

exports.ExerciseModel = Exercise;
exports.ExerciseLog = ExerciseLog;
exports.UserModel = User;
exports.LogModel = Log;
exports.createUser = createUser;
exports.fetchUsers = fetchUsers;
exports.addExercise = addExercise;
exports.createLogEntry = createLogEntry;
exports.pushLogEntry = pushLogEntry;
exports.fetchLogs = fetchLogs;