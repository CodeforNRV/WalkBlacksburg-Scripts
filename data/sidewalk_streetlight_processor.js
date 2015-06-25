#! /usr/bin/env node
//npm install pg

var pg = require('pg');

var conString = "postgres://postgres_admin:IAb0U!J*dhJn@postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com/blacksburg";

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  //Get all of the sidewalk segment points
  client.query('SELECT gid, layer, length, (ST_DumpPoints(geom)).path AS path, ST_AsGeoJSON((ST_DumpPoints(geom)).geom) AS geom FROM sidewalks;', function(err, result) {

    if(err) {
      return console.error('error running query', err);
    }
    console.log('Number of sidewalk points: ', result.rows.length);
    //Put all of these into a multi-dimensional array, one row for each segment (gid)
    var gidArray = new Array;
    for (var i = 0; i < result.rows.length; i++) {
      if(typeof gidArray[result.rows[i].gid] === 'undefined') {
        gidArray[result.rows[i].gid] = [result.rows[i],];
      } else {
        gidArray[result.rows[i].gid].push(result.rows[i]);
      }
    }
    console.log('Sorted results into ', gidArray.length, ' gids');

    var associatedRoads = [];
    for (var i = 1; i < gidArray.length; i++) {
	  //This loops over each sidewalk segment
      var gid = gidArray[i][0]['gid'];
	  count = 0;
      var sql = [];
      for (var j = 0; j < gidArray[i].length; j++) {
        //This loops over each point in each sidewalk segment
        var point = JSON.parse(gidArray[i][j]['geom']);
        sql.push('(SELECT gid, ST_Distance(geom, ST_SetSRID(ST_MakePoint('+point.coordinates[0]+','+point.coordinates[1]+'), 2284)) AS theDistance FROM roads ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint('+point.coordinates[0]+','+point.coordinates[1]+'), 2284)) LIMIT 1)');
      }
      //console.log(sql.join(' UNION '));
      client.query(sql.join(' UNION '), function(err, distanceResults) {
        if(err) {
          return console.error('Error running distance query', err);
        }
        //console.log(distanceResults);
        for (var k = 0; k < distanceResults.rows.length; k++) {
          if (typeof associatedRoads[distanceResults.rows[k].gid] === 'undefined') {
            console.log(distanceResults.rows[k].gid);
            associatedRoads[distanceResults.rows[k].gid] = 0;
          } else {
            associatedRoads[distanceResults.rows[k].gid] += 1;
          }
        }
        //We should be done processing all of the points in this sidewalk segment, so let's go associate it with a road
        associate_road_segment(associatedRoads);
      });
    }
    //release the client back to the pool
    done();
    //client.end();
  });
});

function associate_road_segment(sidewalkAssociatedRoads) {
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
