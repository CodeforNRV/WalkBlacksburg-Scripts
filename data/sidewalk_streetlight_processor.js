#! /usr/bin/env node
//npm install pg

var pg = require('pg');

var conString = "postgres://postgres_admin:password@postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com/blacksburg";

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool');
  }
  //Get a list of all the sidewalk GIDs
  client.query('SELECT DISTINCT gid FROM sidewalks ORDER BY gid;', function(err, sidewalkResults) {
    console.log(sidewalkResults.rows)
    processSidewalks(sidewalkResults.rows);
  });
  done(); //release the client back to the pool
});


function processSidewalks(sidewalkGIDs) {
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return console.error('error fetching client from pool', err);
    }
    //Get all of the sidewalk segment points for each GID
    for (var i in sidewalkGIDs) {
      client.query('SELECT gid, layer, length, (ST_DumpPoints(geom)).path AS path, ST_AsGeoJSON((ST_DumpPoints(geom)).geom) AS geom FROM sidewalks WHERE gid = $1;', [sidewalkGIDs[i]["gid"],], function (err, sidewalkPointResults) {
        if (err) {
          return console.error('error running query', err);
        }
        console.log('Number of sidewalk points: ', sidewalkPointResults.rows.length);
        if (sidewalkPointResults.rows.length == 0) {
          return;
        }

        var gid = sidewalkPointResults.rows[0]['gid'];
        count = 0;
        var sql = [];

        //This loops over each point in each sidewalk segment and creates a big SQL query array to find the closest road to each sidewalk point
        for (var j = 0; j < sidewalkPointResults.rows.length; j++) {
          var point = JSON.parse(sidewalkPointResults.rows[j]['geom']);
          sql.push('(SELECT gid, ST_Distance(geom, ST_SetSRID(ST_MakePoint(' + point.coordinates[0] + ',' + point.coordinates[1] + '), 2284)) AS theDistance FROM roads ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint(' + point.coordinates[0] + ',' + point.coordinates[1] + '), 2284)) LIMIT 1)');
        }
        processDistances(sql);
      });
    }
    done();
  });
}

function processDistances(distanceQueryArray) {
  pg.connect(conString, function (err, client, done) {
    if (err) {
      return console.error('error fetching client from pool', err);
    }
    client.query(distanceQueryArray.join(' UNION '), function (err, distanceResults) {
      if (err) {
        return console.error('Error running distance query', err);
      }
      var associatedRoads = [];
      for (var k = 0; k < distanceResults.rows.length; k++) {
        if (typeof associatedRoads[distanceResults.rows[k].gid] === 'undefined') {
          console.log(distanceResults.rows[k].gid);
          associatedRoads[distanceResults.rows[k].gid] = 0;
        } else {
          associatedRoads[distanceResults.rows[k].gid] += 1;
        }
      }
      //We should be done processing all of the points in this sidewalk segment, so let's go associate it with a road
      associateRoadSegment(associatedRoads);
    });
    done();
  });
}

function associateRoadSegment(sidewalkAssociatedRoads) {
  //So we'll take the array of sidewalk points and their closest road segment, and decide based on some metric (in this case the one with the highest count)
  maxGID = -9999999;
  maxGIDCount = 0;
  for (var k in sidewalkAssociatedRoads) {
	if (sidewalkAssociatedRoads[k] > maxGIDCount) { maxGID = k; }
  }
  
  //Now we'll update the database, setting the hasSidewalks column = true for our GID that had the most sidewalk points associated with it  
  pg.connect(conString, function(err, client, done) {
    var roadGID = maxGID;
    if(err) {
      return console.error('error fetching client from pool in func associate_road_segment', err);
    }
    client.query('UPDATE roads SET hasSidewalks = True WHERE gid = $1;', [roadGID,], function(err, result) {
      if(err) {
        return console.error('error setting hasSidewalks for gid=',roadGID, err);
      }
      console.log('Updated road GID: ', roadGID);
    });
    done();
  });
}


//Flip it around: Does every point on a road have a sidewalk within 8m? Any that don't but have a sidewalk associated with them should be flagged for review
