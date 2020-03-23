const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const jwt = require('jsonwebtoken')

const app = express()

const secretKey = 'thisisverysecretkey'
const adminKey = 'thisisverysecretkey'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',
    database: "jualsabun"
})

const isAuthorized = (request, result, next) => {
    // cek apakah user sudah mengirim header 'x-api-key'
    if (typeof(request.headers['user-token']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token Is Not Provided Or Invalid'
        })
    }

    // get token dari header
    let token = request.headers['user-token']

    // melakukan verifikasi token yang dikirim user
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is Token Is Not Provided Or Invalid'
            })
        }
    })

    // lanjut ke next request
    next()
}

app.get('/', (request, result) => {
    result.json({
        success: true,
        message: 'Welcome & Stay Safe'
    })
})

app.post('/register', (request, result) => {
    let data = request.body

    let sql = `
        insert into users (name, email, password)
        values ('`+data.name+`', '`+data.email+`', '`+data.password+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Your Account Succesfully Registered!'
    })
})

/*************** LOGIN USER ***************/
// endpoint login untuk mendapatkan token dan harus admin admin
app.post('/login', function(request, result) {
    let data = request.body
      var email = data.email;
      var password = data.password;
      if (email && password) {
          db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], function(error, results, fields) {
              if (results.length > 0) {
          let token = jwt.sign(data.email + '|' +data.password, secretKey)
          result.json({
            success: true,
            message: 'Logged In',
            token: token
          });
              } else {
                  result.json({
            success: false,
            message: 'Invalid Credential!',
          });
              }
              result.end();
          });
      }
  });

  /*************** SOAP SECTION ***************/
// endpoint get data sabun dari database
app.get('/soap', isAuthorized, (req, res) => {
    let sql = `
        select * from soap
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            success: true,
            message: 'Success retrieve data from database',
            data: result
        })
    })
})

app.get('/soap/:id', isAuthorized, (req, res) => {
    let sql = `
        select * from soap
        where id_soap = `+req.params.id+`
        limit 1
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Success Getting Soap Details",
            data: result[0]
        })
    })
})


/*************** TRANSACTION ***************/
app.post('/soap/buy/:id', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`
        insert into transaction (id_user, id_soap)
        values ('`+data.id_user+`', '`+req.params.id+`')
    `, (err, result) => {
        if (err) throw err
    })

    db.query(`
        update soap
        set stock = stock - 1
        where id_soap = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Buy Success!"
    })
})

app.get('/soap/usr/:id/trs', isAuthorized, (req, res) => {
    db.query(`
        select transaction.id_trs, soap.name, soap.stock, soap.price
        from users
        right join transaction on users.id_user = transaction.id_user
        right join soap on transaction.id_soap = soap.id_soap
        where users.id_user = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "Getting Transaction Success!",
            data: result
        })
    })
})

/*************** BELOW IS ADMINISTRATOR ONLY! ***************/

//====================================   JWT   ==============================================//
const adminAuth = (request, result, next) => {
    // cek apakah user sudah mengirim header 'x-api-key'
    if (typeof(request.headers['admin-auth']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token Is Not Provided Or Invalid'
        })
    }

    // get token dari header
    let token = request.headers['admin-auth']

    // melakukan verifikasi token yang dikirim user
    jwt.verify(token, adminKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token Is Not Provided Or Invalid'
            })
        }
    })

    // lanjut ke next request
    next()
}

//====================================   ADMIN LOGIN   ==============================================//
app.post('/adm/login', function(request, result) {
  let data = request.body
	var email = data.email;
	var password = data.password;
	if (email && password) {
		db.query('SELECT * FROM admin WHERE email = ? AND password = ?', [email, password], function(error, results, fields) {
			if (results.length > 0) {
        let token = jwt.sign(data.email + '|' +data.password, adminKey)
        result.json({
          success: true,
          message: 'Logged In',
          token: token
        });
			} else {
				result.json({
          success: false,
          message: 'Invalid Credential!',
        });
			}
			result.end();
		});
	}
});

//====================================   GET soap   ==============================================//
app.get('/adm/soap', adminAuth, (req, res) => {
    let sql = `
        select * from soap
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            success: true,
            message: 'Success retrieve data from database',
            data: result
        })
    })
})

//====================================   GET soap BY ID   ==============================================//
app.get('/adm/soap/:id', adminAuth, (req, res) => {
    let sql = `
        select * from soap
        where id_soap = `+req.params.id+`
        limit 1
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "Success Getting soap Details",
            data: result[0]
        })
    })
})

//====================================   POST soap   ==============================================//
// endpoint add data sabun ke dataase
app.post('/adm/soap', adminAuth, (request, result) => {
    let data = request.body

    let sql = `
        insert into soap (name, price, stock)
        values ('`+data.name+`','`+data.price+`', '`+data.stock+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Your new soap has been Added!'
    })
})

//====================================   PUT soap BY ID   ==============================================//
// endpoint edit data sabun ke database
app.put('/adm/soap/:id', adminAuth, (request, result) => {
    let data = request.body

    let sql = `
        update soap
        set name = '`+data.name+`', price = '`+data.price+`', stock = '`+data.stock+`'
        where id_soap = `+request.params.id+`
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'soap Data has been updated'
    })
})

//====================================   DELETE soap BY ID   ==============================================//
// endpoint hapus data sabun dari database
app.delete('/adm/soap/:id', adminAuth, (request, result) => {
    let sql = `
        delete from soap where id_soap = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'soap Data has been deleted'
    })
})

app.get('/adm/soap/:id/trs', adminAuth, (req, res) => {
    db.query(`
        select transaction.id_trs, soap.name, soap.price
        from users
        right join transaction on users.id_user = transaction.id_user
        right join soap on transaction.id_soap = soap.id_soap
        where users.id_user = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "Getting Transaction Success!",
            data: result
        })
    })
})
//FIX BELOW!
//====================================   GET ALL TRANSACTION BY ID  (FIX) ==============================================//
app.get('/adm/soap/trs/', adminAuth, (req, res) => {
    db.query(`
        select * from transaction
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "Getting Transaction Success!",
            data: result
        })
    })
})



  app.listen(1337, () => {
    console.log('App is running on port 1337!')
})
  