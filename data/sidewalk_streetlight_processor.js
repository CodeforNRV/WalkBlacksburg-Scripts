#! /usr/bin/env node
//npm install pg

var pg = require('pg');

var conString = "postgres://postgres_admin:IAb0U!J*dhJn@postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com/blacksburg";

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  //Get all of the sidewalk segment points
  client.query('SELECT gid, layer, length, (ST_DumpPoints(geom)).path AS path, ST_AsGeoJSON((ST_DumpPoints(geom)).geom) AS geom FROM sidewalks LIMIT 20;', function(err, result) {

    if(err) {
      return console.error('error running query', err);
    }
    
    //Put all of these into a multi-dimensional array, one row for each segment (gid)
    var gidArray = [];
    for (var i = 0; i < result.rows.length; i++) {
      if(typeof gidArray[result.rows[i].gid] === 'undefined') {
        gidArray[result.rows[i].gid] = [result.rows[i],];
      } else {
        gidArray[result.rows[i].gid].push(result.rows[i]);
      }
    }

    var associatedRoads = [];
    for (var i = 1; i < gidArray.length; i++) {
	  //This loops over each sidewalk segment
      var gid = gidArray[i][0]['gid'];
	  count = 0;
      for (var j = 0; j < gidArray[i].length; j++) {
	    //This loops over each point in each sidewalk segment
        var point = JSON.parse(gidArray[i][j]['geom']);
        client.query('SELECT gid, ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 2284)) AS theDistance FROM roads ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 2284)) LIMIT 1;', [point.coordinates[0], point.coordinates[1]], function(err, distanceResults) {
          if(err) {
            return console.error('Error running distance query', err);
          }
          if(typeof associatedRoads[gid] === 'undefined') {
            associatedRoads[gid] = 0;
          } else {
            associatedRoads[gid] += 1;
          }
		  count += 1;
		  if (count == gidArray[i].length) {
		    //We should be done processing all of the points in this sidewalk segment, so let's go associate it with a road
			associate_road(associateRoads);
		  }
        });
		
      } 
    }
    //release the client back to the pool
    //done();
    //client.end();
  });
});

function associate_road(sidewalkAssociatedRoads) {
  //So we'll take the array of sidewalk points and their closest road segment, and decide based on some metric (in this case the one with the highest count)
  maxGID = -9999999;
  maxGIDCount = 0;
  for (var k in roadGIDs) {
	if (roadGIDs[k] > maxGIDCount) { maxGID = k; }
  }
  
  //Now we'll update the database, setting the hasSidewalks column = true for our GID that had the most sidewalk points associated with it  
  pg.connect(conString, function(err, client, done) {
	  if(err) {
		return console.error('error fetching client from pool', err);
	  }
	  //Get all of the sidewalk segment points
	  client.query('UPDATE roads SET hasSidewalks = True WHERE gid = $1;', [maxGID,], function(err, result) {
		if(err) {
		  return console.error('error running query', err);
		}
		console.log(maxGID);
	  }
	  
  }
}
//Parse that into a structured array with one row for each gid

//for each gid
//for each point in the gid
//SELECT *, ST_Distance(geom, ST_SetSRID(ST_MakePoint(10928119.708678,3601579.38718802), 2284)) AS distance1 FROM roads
//ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint(10928119.708678,3601579.38718802), 2284))
//LIMIT 1;
//Store the results in an array for each gid
//At the end of each gid determine if they all match a particular road (90%+ or whatever threshold)




//Flip it around: Does every point on a road have a sidewalk within 8m? Any that don't but have a sidewalk associated with them should be flagged for review
