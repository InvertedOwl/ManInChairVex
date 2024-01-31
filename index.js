const express = require('express')
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const app = express()
app.use(express.static('maninchair/dist'));

const port = 3101

// Connect to the database
let db = new sqlite3.Database('stats.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the in-memory SQLite database.');
    db.run("CREATE TABLE IF NOT EXISTS matches (rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, division INTEGER, round TEXT, instance INTEGER, match INTEGER, data TEXT);");
    db.run("CREATE TABLE IF NOT EXISTS rankings (rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, division INTEGER, round TEXT, teamnum TEXT, rank INTEGER, wp INTEGER, ap INTEGER, sp INTEGER, wins INTEGER, losses INTEGER, ties INTEGER, winPct REAL, numMatches INTEGER, totalPoints INTEGER, avgPoints REAL, highScore INTEGER);");
    db.run("CREATE TABLE IF NOT EXISTS stats (rowid INTEGER PRIMARY KEY,modified INTEGER,deleted INTEGER,sku TEXT,division INTEGER,teamnum TEXT,opr REAL,dpr REAL,ccwm REAL);");
    db.run("CREATE TABLE IF NOT EXISTS skills ( rowid INTEGER PRIMARY KEY, modified INTEGER, deleted INTEGER, sku TEXT, teamnum TEXT, rank INTEGER, tie INTEGER, ageGroup TEXT, totalScore INTEGER, driverAttempts INTEGER, driverHighScore INTEGER, progAttempts INTEGER, progHighScore INTEGER);");

    
    
});

function sqliteToJson(tableName, callback) {
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
        fetch("https://data.vexvia.dwabtech.com/api/v3/event/"+req.query.event.toLowerCase()+"?schema=212&since=0&timeout=100000").then((response) => {
            response.text().then((text) => {
                const type = req.params.type; // Access the variable part
                db.run("BEGIN TRANSACTION");
                db.run("DELETE FROM matches");
                db.run("DELETE FROM rankings");
                db.run("DELETE FROM stats");
                db.run("DELETE FROM skills");            for (let i = 0; i < text.split(";").length; i++) {
                    db.run(text.split(";")[i], (err) => {
                        if (err) {
                            console.log(text.split(";")[i]);
                        }
                    });
                }
                db.run("COMMIT");
                const tableName = type; // Update with your table name

                sqliteToJson(tableName, (err, jsonData) => {
                    if (err) {
                        res.status(500).send('Error reading database');
                    } else {
                        res.json(jsonData);
                    }
                });
            })
        });  
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