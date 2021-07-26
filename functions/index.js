let admin = require('firebase-admin');
let express = require('express');
let router = require('express').Router()
let functions = require('firebase-functions');
let app = express();
let path = require('path');
let hbs = require('express-handlebars')
const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const os = require('os');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("441065807559-jo9ip2rtudn8kspfph5gedhv3d9n1onv.apps.googleusercontent.com");


const helpers = {
    inc: function(val) {
        val = val + 1;
        return val;
    },
    json: function(val) {
        return JSON.stringify(val)
    },
    jsonScape: function(val) {
        return JSON.stringify(val).replace(/\\/g, '')
    },
    checklength: function(val, options) {
        'use strict';
        if (val.length > 0) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
    ifeq: function(a, b, options) {
        if (a === b) { return options.fn(this); }
        return options.inverse(this);
    },
    ifnoteq: function(a, b, options) {
        if (a !== b) { return options.fn(this); }
        return options.inverse(this);
    },

    if_eq: function() {
        const args = Array.prototype.slice.call(arguments, 0, -1);
        const options = arguments[arguments.length - 1];
        const allEqual = args.every(expression => {
            return args[0] === expression;
        });
        return allEqual ? options.fn(this) : options.inverse(this);
    }
};


app.engine('hbs', hbs({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '/views'),
    partialsDir: path.join(__dirname, '/views/partials/'),
    extname: '.hbs',
    helpers: helpers
}));

app.set('view engine', 'hbs');

let cors = require('cors');
const { nextTick } = require('process');

app.use(cors({ origin: true }));

admin.initializeApp({
    credential: admin.credential.cert('./firebase.json'),
    databaseURL: 'https://bonnito-mx.firebaseio.com',
    storageBucket: 'bonnito-mx.appspot.com',
});

const config = {
    projectId: 'bonnito-mx.appspot.com',
    keyFilename: './firebase.json'
};

let db = admin.database();
let refProducts = db.ref("products/");
let refCategories = db.ref("categories/");
let refOffer = db.ref("offer/");
let refUsers = db.ref("users/");

app.get('/search', (req, res) => {
    let qOriginal = req.query.q ? req.query.q : "";
    let q = req.query.q ? req.query.q.toLowerCase() : "";
    let products = [];
    refProducts.on('value', (snapshot) => {
        snapshot.forEach((child) => {
            if (child.val().searchCriteria) {
                let searchCriteria = child.val().searchCriteria;
                if (searchCriteria.some(result => result.includes(q))) products.push(child.val())
            } else return;
        });
        return res.render('search', { products, qOriginal })
    })
})

app.get('/main', (req, res) => {
    let topFive = [],
        ear = [],
        decorar = [];
    refProducts.orderByChild("topFive").equalTo(true).on("value", snapshot => {
        snapshot.forEach((child) => {
            topFive.push(child.val());
        });
        topFive.sort((a, b) => (a.topFivePosition > b.topFivePosition) ? 1 : -1);
    });
    refProducts.orderByChild("ear").equalTo(true).on("value", snapshot => {
        snapshot.forEach(c => {
            ear.push(c.val());
        });
        ear.sort((a, b) => (a.earPosition > b.earPosition) ? 1 : -1);
    });
    refProducts.orderByChild("decorar").equalTo(true).on("value", snapshot => {
        snapshot.forEach(c => {
            decorar.push(c.val());
        });
        decorar.sort((a, b) => (a.decorarPosition > b.decorarPosition) ? 1 : -1);
        return res.render('mainPage', { layout: false, topFive, decorar, ear});
    });
});

app.get('/categories', (req, res) => {
    let categories = []
    refCategories.orderByChild('position').on('value', (snapshot) => {
        snapshot.forEach((child) => {
            categories.push(child.val());
        });
        return res.render('categoriesList', { categories })
    })
});

app._router.get('/categories/:id', (req, res) => {
    //res.set('Cache-Control','public, max-age=300, s-maxage=600');
    let { id } = req.params, products = [], categoryName;
    refCategories.orderByChild("identifier").equalTo(id).on("value", snapshot => {
        snapshot.forEach(childSnapshot => {
            categoryName = childSnapshot.val().name;
        });
    })
    refProducts.orderByChild("category").equalTo(id).on("value", snapshot => {
        snapshot.forEach(child => {
            products.push(child.val())
        });
        products.sort((a, b) => (a.position > b.position) ? 1 : -1)
        return res.render('categoryView', { products, categoryName })
    })
});

app._router.get('/offer', (req, res) => {
    let products = [];
    refOffer.orderByChild("position").on("value", snapshot => {
        snapshot.forEach(child => {
            products.push(child.val())
        });
        products.sort((a, b) => (a.position > b.position) ? 1 : -1)
        return res.render('offer', { products })
    })
});

/*
//CAMBIADOR DE PRECIO - Ejecutar por categoría
app.get('/admin/changeProducts', (req, res) => {
    let products = [];
    refProducts.orderByChild("category").equalTo('frases').on("value", snapshot => {
        snapshot.forEach(child => {
            let hijo = child.val()
            hijo['id'] = child.key
            products.push(hijo)
        })
        const promises = [];
        products.forEach(product => {
            let newPrice = "$27.00 MXN"
            const promise = db.ref(`products/${product.id}/price`).set(newPrice);
            promises.push(promise)
        })
        Promise.all(promises).then(results => {
            console.log("Hecho")
            return;
        }).catch(e => { return console.log("Error: " + e) })
    })
})


// app.get('/admin/login', (req, res) => {
//     return res.render('adminLogin')
// })


app.post('/admin/tokensignin', (req, res, next) => {
    let uid, name;
    client.verifyIdToken({ idToken: req.body.idtoken, audience: "441065807559-jo9ip2rtudn8kspfph5gedhv3d9n1onv.apps.googleusercontent.com" }).then((decodedToken) => {
        uid = decodedToken.getPayload().sub;
        name = decodedToken.getPayload().name;
        return uid
    }).catch((error) => {
        return error
    });

    refUsers.on('value', (snapshot) => {
        snapshot.forEach((child) => {
            if (child.val() === uid) {
                return req.session.loggedin = true;
            } else {
                return res.redirect("/admin/login");
            }
        });
    })
})

function requireLogin(req, res, next) {
    console.log(req)
    if (req.session.loggedIn) {
        return next(); // allow the next route to run
    } else {
        // require the user to log in
        res.redirect("/login"); // or render a form, etc.
    }
}

// app.all("/admin/*", requireLogin, (req, res, next) => {
//     next();
// });


app.get('/admin/panel', (req, res) => {
    return res.render('adminPanel')
})


app._router.get('/admin/add_product', (req, res) => {
    let categories = []
    refCategories.orderByChild('position').on('value', (snapshot) => {
        snapshot.forEach((child) => {
            categories.push(child.val())
        });
        return res.render('newProduct', { categories })
    })
});

app._router.get('/admin/add_product_provisional', (req, res) => {
    let newProduct = {
        "category": "libros",
        "imagePath": "ventajas2.JPG",
        "position": 39,
        "price": "$27.00 MXN",
        "searchCriteria": ["libros", "las ventajas de ser invisible", "stephen chbosky"],
        "title": "Las ventajas de ser invisible 2"
    }
    refProducts.push().set(newProduct).then(() => {
        return console.log("hecho")
    }).catch(e => console.log(e))
});



app._router.get('/admin/add_category', (req, res) => {
    let newCategory = {
        iconName: "espadas-01.png",
        identifier: "espadas",
        name: "Espadas",
        position: 13
    }

    refCategories.push().set(newCategory)
});

app._router.get('/admin/add_offer', (req, res) => {
    let newOffer = {
        "category": "ofertas",
        "imagePath": "cupido.jpeg",
        "offer": true,
        "position": 19,
        "price": "$18.00 MXN",
        "searchCriteria": ["ofertas", "frases", "cupido"],
        "stock": 1,
        "title": "Cupido"
    }
    refOffer.push().set(newOffer)
});

app.post('/admin/sendProduct', (req, res) => {
    let newProduct = {};
    const busboy = new Busboy({
        headers: req.headers,
        limits: { fileSize: 10 * 1024 * 1024 }
    });

    let imageFileName = {}
    let imagesToUpload = []
    let imageToAdd = {}
    const fields = {};

    var storage = new Storage(config);
    const bucket = storage.bucket('categories/');
    let folder = ''
    busboy.on('field', (fieldname, val) => {
        fields[fieldname] = val;
        if (fieldname === 'price') val ? val = "$" + val + ".00 MXN" : val = ""
        if (fieldname === 'category') {
            val ? val = (val).replace(/['"]+/g, '') : val = "";
            folder = val;
        }
        if (fieldname === 'searchCriteria') {
            let searchCriteria = val ? val.split(',') : ""
            if (searchCriteria.length > 0) searchCriteria = searchCriteria.map(el => el.trim());
            val = searchCriteria
        }
        newProduct[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
            return res.status(400).json({ error: "Tipo de imagen incorrecto" });
        }
        imageFileName = filename;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToAdd = {
            fieldname,
            imageFileName,
            filepath,
            mimetype
        };
        file.pipe(fs.createWriteStream(filepath));

        imagesToUpload.push(imageToAdd);
    });

    busboy.on("finish", async() => {
        let promises = []
        let imageUrls = []
        let products = []
        imagesToUpload.forEach(imageToBeUploaded => {
            imageUrls.push(`https://storage.googleapis.com/${bucket}/categories/o${folder}%2F${imageToBeUploaded.imageFileName}?alt=media`)
            promises.push(admin
                .storage()
                .bucket()
                .upload(imageToBeUploaded.filepath, {
                    destination: `categories/${folder}/${imageToBeUploaded.imageFileName}`,
                    resumable: false,
                    metadata: {
                        metadata: {
                            contentType: imageToBeUploaded.mimetype
                        }
                    }
                })), newProduct[imageToBeUploaded.fieldname] = `${imageToBeUploaded.imageFileName}`;
        })
        promises.push(
            refProducts.orderByChild("category").equalTo(folder).on("value", snapshot => {
                snapshot.forEach(child => products.push(child.val()));
                newProduct['position'] = products.length;
            })
        )
        try {
            await Promise.all(promises)
            refProducts.push().set(newProduct).then(() => {
                return res.redirect(`http://localhost:9000/admin/orderProducts/${newProduct['category']}`)
            }).catch(e => console.log(e))
        } catch (err) { res.status(500).json(err), console.log("hubo error" + err) }
    })
    busboy.end(req.rawBody);
});

app.get('/admin/categories', (req, res) => {
    let categories = []
    refCategories.orderByChild('position').on('value', (snapshot) => {
        snapshot.forEach((child) => {
            categories.push(child.val())
        });
        return res.render('adminCategories', { categories })
    })
});

app.get('/admin/orderProducts/:id', (req, res) => {
    let { id } = req.params, products = [], categoryName;
    refCategories.orderByChild("identifier").equalTo(id).on("value", snapshot => {
        snapshot.forEach(childSnapshot => {
            categoryName = childSnapshot.val().name;
        });
    })
    refProducts.orderByChild("category").equalTo(id).on("value", snapshot => {
        snapshot.forEach(child => {
            let hijo = child.val()
            hijo['id'] = child.key
            products.push(hijo)
        });
        products.sort((a, b) => (a.position > b.position) ? 1 : -1)
        return res.render('orderProducts', { products, categoryName })
    })
});

app.post('/admin/saveReorderedProducts', (req, res) => {
    const promises = [];
    let { orderedProducts } = req.body;
    orderedProducts.forEach(product => {
        let newPosition = parseInt(`${product.newPosition}`)
        const promise = db.ref(`products/${product.id}/position`).set(newPosition);
        promises.push(promise)
    })
    Promise.all(promises).then(results => {
        res.status(200).end();
        return;
    }).catch(e => { return console.log("Error: " + e) })
})
*/

exports.app = functions.https.onRequest(app)