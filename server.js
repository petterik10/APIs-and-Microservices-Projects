const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const dns = require("dns");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const arrayOfUrl = [];
let count = 0;

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/Exercise", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const cors = require("cors");
app.use(cors({ optionsSuccessStatus: 200 }));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/timestamp", (req, res) => {
  res.render("timestamp");
});

app.get("/header_parser", (req, res) => {
  res.render("header_parser");
});

app.get("/url_shortener", (req, res) => {
  res.render("url_shortener");
});

app.get("/file_meta_data", (req, res) => {
  res.render("file_meta_data");
});

app.get("/exercise_tracker", (req, res) => {
  res.render("exercise_tracker");
});

//  1.Timestamp project starts
app.get("/api/timestamp/:date_string", function (req, res) {
  let date = req.params.date_string;
  let newDate;

  if (!isNaN(date)) {
    newDate = new Date(parseInt(date));
  } else {
    newDate = new Date(date);
  }

  if (newDate.toString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    res.json({ unix: newDate.getTime(), utc: newDate.toUTCString() });
  }
});

app.get("/api/timestamp", (req, res) => {
  const time = new Date();
  const hello = time.getTime();
  const utcTime = time.toUTCString();
  res.json({ unix: hello, utc: utcTime });
});

// Timestamp project ends

// 2. Request Header Parse Microservice project starts
app.get("/api/whoami", function (req, res) {
  res.json({
    ipaddress: req.headers["x-forwarded-for"],
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

// Request Header Parser Microservice project ends

// 3. URL shortener project starts
app.get("/api/shorturl/:url", (req, res) => {
  const shortUrl = req.params.url;
  const findUrlObject = arrayOfUrl.find((elem) => {
    return elem["short_url"] == shortUrl;
  });

  if (findUrlObject == undefined) {
    res.json({ error: "Not Valid URL" });
  } else {
    res.redirect(arrayOfUrl[0]["original_url"]);
  }
});

app.post("/api/shorturl/new", (req, res) => {
  let { url } = req.body;
  const REPLACE_REGEX = /^https?:\/\//i;
  const res2 = url.replace(REPLACE_REGEX, "");
  count++;

  const w3 = dns.lookup(res2, function (err, addresses, family) {
    if (err) {
      res.json({ error: "Invalid Url" });
    } else {
      arrayOfUrl.push({ original_url: url, short_url: count });
      res.json({ original_url: url, short_url: count });
    }
  });
});

// URL shortener project ends

// 4. Exercise tracker project starts

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: { type: String, required: true },
  date: String,
  count: Number,
});

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

const Username = mongoose.model("Username", userSchema);

app.get("/api/exercise/users", (req, res) => {
  Username.find({}, (err, users) => {
    if (err) console.log(err);
    const userArray = [];
    userArray.push(users);
    res.json(userArray);
  });
});

app.get("/api/exercise/log", (req, res) => {
  const query = req.query.userId;
  Username.findById(query, (err, result) => {
    if (!err) {
      let userObj = result;

      if (req.query.from || req.query.to) {
        const fromDate = new Date(req.query.from).getTime();
        const toDate = new Date(req.query.to).getTime();

        userObj.log = userObj.log.filter((elem) => {
          const exerciseDates = new Date(elem.date).getTime();
          return exerciseDates >= fromDate && exerciseDates <= toDate;
        });
      }
      if (req.query.limit) {
        userObj.log = userObj.log.slice(0, req.query.limit);
      }

      res.json({
        _id: userObj._id,
        username: userObj.username,
        count: userObj.log.length,
        log: userObj.log,
      });
    }
  });
});

app.post("/api/exercise/new-user", (req, res) => {
  const new_user = new Username({
    username: req.body.username,
  });
  new_user.save(function (err) {
    if (!err) {
      res.json({
        username: new_user.username,
        _id: new_user._id,
      });
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  const id = req.body.userId;
  const newExecise = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date,
    count: 1,
  });
  if (newExecise.date === "") {
    newExecise.date = new Date().toDateString();
  }

  Username.findByIdAndUpdate(
    id,
    { $push: { log: newExecise } },
    { new: true },
    (err, user) => {
      res.json({
        _id: user._id,
        username: user.username,
        date: new Date(newExecise.date).toDateString(),
        duration: newExecise.duration,
        description: newExecise.description,
      });
    }
  );
});

// Exercise tracker project ends

// 5. File metadata project starts
app.post("/api/fileanalyse", upload.single("upfile"), function (
  req,
  res,
  next
) {
  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

// 5. File metadata project ends

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
