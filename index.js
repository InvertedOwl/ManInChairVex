const express = require('express')
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const app = express()
app.use(express.static('maninchair/dist'));
const fs = require('fs');

const port = 3101

// Connect to the database
function createDB(name) {
    fs.mkdir("dbs", () => {});
    let db = new sqlite3.Database("dbs/" + name + '.db', (err) => {
        if (err) {
          return console.error(err.message);
        }
            
    });
    db.run("CREATE TABLE IF NOT EXISTS matches (rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, division INTEGER, round TEXT, instance INTEGER, match INTEGER, data TEXT);");
    db.run("CREATE TABLE IF NOT EXISTS rankings (rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, division INTEGER, round TEXT, teamnum TEXT, rank INTEGER, wp INTEGER, ap INTEGER, sp INTEGER, wins INTEGER, losses INTEGER, ties INTEGER, winPct REAL, numMatches INTEGER, totalPoints INTEGER, avgPoints REAL, highScore INTEGER);");
    db.run("CREATE TABLE IF NOT EXISTS stats (rowid INTEGER PRIMARY KEY,modified INTEGER,deleted INTEGER,sku TEXT,division INTEGER,teamnum TEXT,opr REAL,dpr REAL,ccwm REAL);");
    db.run("CREATE TABLE IF NOT EXISTS skills ( rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, teamnum TEXT, rank INTEGER, tie INTEGER, ageGroup TEXT, totalScore INTEGER, driverAttempts INTEGER, driverHighScore INTEGER, progAttempts INTEGER, progHighScore INTEGER);");
    console.log('Created DB for ' + name);

    return db;
}


const lastRequest = {}
let toUpdate = []

function updateData() {

    set = [...new Set(toUpdate)];
    set.forEach((event) => {
        db = lastRequest[event].db;
        fetch("https://data.vexvia.dwabtech.com/api/v3/event/"+event+"?schema=212&since=" + 0 + "&timeout=100000").then((response) => {
            response.text().then((text) => {
                console.log("Got event data for " + event);
                db.run("BEGIN TRANSACTION", (err) => {if (!err)return;console.log("Begin err " + err)});
    
                for (let i = 0; i < text.split(";").length; i++) {
                    db.run(text.split(";")[i], (err) => {
    
                    });
                }
                db.run("COMMIT", (err) => {if (!err)return; console.log("Commit err " + err) });
            })
            console.log("Finished");
        });
    }) 
    toUpdate = [];
}

setInterval(updateData, 2000);

function sqliteToJson(tableName, db, callback) {
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            callback(err, null);
        }
        callback(null, rows);
    });
}

app.get('/data/:type', (req, res) => {
    if (req.query.event.toLowerCase() == "") {
        res.sendStatus(200);
        return;
    }
    try {

        console.log(req.query.event.toLowerCase());
        
        let db;
        if (!Object.keys(lastRequest).includes(req.query.event.toLowerCase())) {
            db = createDB(req.query.event.toLowerCase());
            lastRequest[req.query.event.toLowerCase()] = {db: db, since: 0};
            updateData(req.query.event.toLowerCase());
        } else {
            db = lastRequest[req.query.event.toLowerCase()].db;
        }
        console.log(lastRequest);

        sqliteToJson(req.params.type, db, (err, jsonData) => {
            if (err) {
                res.status(500).send('Error reading database');
            } else {
                res.json(jsonData);
            }
        });
        toUpdate.push(req.query.event.toLowerCase());

    } catch (e) {
        console.log(e);
    }
    
    
});

app.get('/:d', (req, res) => {
    res.sendFile(__dirname + '/maninchair/dist/index.html')
});
  
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})