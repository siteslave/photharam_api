'use strict';

require('dotenv').config();
const Knex = require('knex');
const crypto = require('crypto');
var multer = require('multer');
const moment = require('moment');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const HttpStatus = require('http-status-codes');
const fse = require('fs-extra');
const jwt = require('./jwt');
const model = require('./model');

const app = express();

const uploadDir = process.env.UPLOAD_DIR || './uploaded';

fse.ensureDirSync(uploadDir);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage });

// var upload = multer({ dest: process.env.UPLOAD_DIR || './uploaded' });

var db = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: +process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  pool: {
    min: 0,
    max: 100,
    afterCreate: (conn, done) => {
      conn.query('SET NAMES utf8', (err) => {
        done(err, conn);
      });
    }
  },
});

let checkAuth = (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else {
    token = req.body.token;
  }

  jwt.verify(token)
    .then((decoded) => {
      req.decoded = decoded;
      next();
    }, err => {
      return res.send({
        ok: false,
        error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED),
        code: HttpStatus.UNAUTHORIZED
      });
    });
}

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (req, res) => res.send({ ok: true, message: 'Welcome to my api serve!', code: HttpStatus.OK }));
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  res.send({ ok: true, message: 'File uploaded!', code: HttpStatus.OK });
});

app.post('/login', async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  if (username && password) {
    var encPassword = crypto.createHash('md5').update(password).digest('hex');

    try {
      var rs = await model.doLogin(db, username, encPassword);
      if (rs.length) {
        var token = jwt.sign({ username: username });
        res.send({ ok: true, token: token });
      } else {
        res.send({ ok: false, error: 'Invalid username or password!', code: HttpStatus.UNAUTHORIZED });
      }
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
    }

  } else {
    res.send({ ok: false, error: 'Invalid data!', code: HttpStatus.INTERNAL_SERVER_ERROR });
  }

});

app.post('/patient-login', async (req, res) => {
  var username = req.body.username; // cid
  var birthday = req.body.password; // birthday

  if (username && birthday) {

    var _mDate = moment(birthday, 'YYYYMMDD');
    var _year = _mDate.format('YYYY') - 543;
    var _month = _mDate.format('MM');
    var _day = _mDate.format('DD');

    var ptBirthday = `${_year}-${_month}-${_day}`;

    try {
      var rs = await model.loginPatient(db, username, ptBirthday);
      if (rs[0].length) {
        var fullname = `${rs[0][0].fname} ${rs[0][0].lname}`;
        var hn = rs[0][0].hn;

        var token = jwt.sign({ username: username, hn: hn });
        res.send({ ok: true, token: token, hn: hn, fullname: fullname });
      } else {
        res.send({ ok: false, error: 'Invalid username or password!', code: HttpStatus.UNAUTHORIZED });
      }
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
    }

  } else {
    res.send({ ok: false, error: 'Invalid data!', code: HttpStatus.INTERNAL_SERVER_ERROR });
  }

});

app.get('/users', checkAuth, async (req, res, next) => {
  try {
    var rs = await model.getList(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.get('/labs/order', checkAuth, async (req, res, next) => {
  try {
    var hn = req.decoded.hn;
    var rs = await model.getLabOrders(db, hn);
    var data = [];
    rs.forEach(v => {
      var obj = {
        "lab_order_number": v.lab_order_number,
        "reporter_name": v.reporter_name,
        "order_date": moment(v.order_date).locale('th').format('DD MMMM YYYY'),
        "report_date": moment(v.report_date).locale('th').format('DD MMMM YYYY'),
        "order_time": v.order_time,
        "report_time": v.report_time,
        "form_name": v.form_name,
        "department": v.department,
        "confirm_report": v.confirm_report
      };

      data.push(obj);

    });
    res.send({ ok: true, rows: data });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.post('/users', checkAuth, async (req, res, next) => {
  try {
    var username = req.body.username;
    var password = req.body.password;
    var fullname = req.body.fullname;
    var email = req.body.email;

    if (username && password && email && fullname) {
      var encPassword = crypto.createHash('md5').update(password).digest('hex');
      var data = {
        username: username,
        password: encPassword,
        fullname: fullname,
        email: email
      };
      var rs = await model.save(db, data);
      res.send({ ok: true, id: rs[0] });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.put('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;
    var fullname = req.body.fullname;
    var email = req.body.email;

    if (id && email && fullname) {
      var data = {
        fullname: fullname,
        email: email
      };
      var rs = await model.update(db, id, data);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.delete('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;

    if (id) {
      await model.remove(db, id);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.get('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;

    if (id) {
      var rs = await model.getInfo(db, id);
      res.send({ ok: true, info: rs[0] });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

//error handlers
if (process.env.NODE_ENV === 'development') {
  app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        ok: false,
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
      }
    });
  });
}

app.use((req, res, next) => {
  res.status(HttpStatus.NOT_FOUND).json({
    error: {
      ok: false,
      code: HttpStatus.NOT_FOUND,
      error: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
    }
  });
});

var port = +process.env.WWW_PORT || 3000;

app.listen(port, () => console.log(`Api listening on port ${port}!`));