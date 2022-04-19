const express = require('express');
const bodyParse = require('body-parser');
const mysql = require('mysql');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const exphbs = require('express-handlebars');
app.use(bodyParse.urlencoded({ extended: false }));
app.use(bodyParse.json());
app.use(express.static('public'));
var session = require('express-session')

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}))

app.engine('html', exphbs.engine({
    extname: '.html',
    defaultLayout: false
}));

app.set('view engine', 'ejs');

const connection = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'natural',
});

connection.getConnection((err, result) => {
    if (err) throw err;
    console.log("connected as ID" + result.threadId);
})

var msg = "";
app.get('', (req, res) => {
    res.render('index', { name: "Anshu" });

});
app.get('/about', (req, res) => {
    res.render('about');

});

app.get('/contact', (req, res) => {
    res.render('contact');

});

app.get('/signup', (req, res) => {
    res.render('signup', { msg: msg });

});

app.post('/register', (req, res) => {
    const { name, email, pswd } = req.body;

    connection.query('select email from users where email = ? OR name = ?', [email, name],
        (err, result) => {
            console.log(result);
            const emailNotExist = result.length === 0;
            if (emailNotExist) {
                connection.query('INSERT INTO `users` ( `name`, `email`, `password`) VALUES (?, ?, ?)',
                    [name, email, pswd],
                    (err, result) => {
                        if (err) return reject(err);
                        res.redirect('/signup');
                    });
            } else if (err) return reject(err);
            else {
                res.send('Email or Username already exist');
            }
        });
    // res.send("Html");
})

app.post('/login', (req, res) => {
    const { email, pswd } = req.body;

    connection.query("Select * from users where email=? AND password=?", [email, pswd], (err, row) => {
        if (!err) {
            if (row.length > 0) {
                msg = "";
                sess = req.session;
                sess.data = row[0];
                res.redirect("/home");
            } else {
                msg = "incorrect credentials";
                res.redirect("/signup")
            }
        }

    })
})

app.get("/home", (req, res) => {
    console.log(req.session);
    if (req.session.data) {
        connection.query("select * from product", (err, row) => {
            if (!err) {
                res.render("services", { data: req.session.data, products: row });
            }
        })
    } else {
        res.redirect("/signup")
    }
})

app.post("/product_add", (req, res) => {
    // console.log(req.body)
    const { pid, pname, pprice, pqty, pimage, pcode } = req.body;
    let total_price = pprice * pqty;
    connection.query("SELECT product_code FROM cart WHERE product_code=?", [pcode], (err, result) => {
        if (!err) {
            console.log(result);
            if (result.length == 0) {
                connection.query("INSERT INTO cart(product_name,product_price,product_image,qty,total_price,product_code) VALUES (?,?,?,?,?,?)",
                    [pname, pprice, pimage, pqty, total_price, pcode], (error, row) => {
                        if (!error) {
                            res.send(`<div class="alert alert-success alert-dismissible mt-2">
                                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                                        <strong>Item added to your cart!</strong>
                                    </div>`
                            );
                        }
                    })
            } else {
                res.send(`<div class="alert alert-danger alert-dismissible mt-2">
                            <button type="button" class="close" data-dismiss="alert">&times;</button>
                            <strong>Item already added to your cart!</strong>
                        </div>`
                );
            }
        }

    })
})

app.get("/cart_number", (req, res) => {
    connection.query("SELECT * FROM cart", (err, row) => {
        if (!err) {
            res.send((row.length).toString());
        }
    })
})

app.get("/cart", (req, res) => {

    if (req.session.data) {
        connection.query("SELECT * FROM cart", (err, row) => {
            if (!err) {
                res.render("cart", { data: req.session.data, in_cart: row });
            }
        })
    } else {
        res.redirect("/signup")
    }
})

// set total price of product in the cart table 
app.post("/change_qty", (req, res) => {
    const { qty, pid, pprice } = req.body;
    let tprice = qty * pprice;

    connection.query('UPDATE cart SET qty=?, total_price=? WHERE id=?', [qty, tprice, pid], (err, result) => {
        if (!err) {
            res.send("Success full");
        } else {
            res.send("Failed");
        }
    });
})


// Remove single items from cart
app.get("/remove_from_cart/:pid", (req, res) => {
    const product_id = req.params.pid;
    res.send(product_id);
})

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
        }
        res.redirect("/");
    })
})





app.listen(port, () => console.log('server started succesfulluy on port', port));

