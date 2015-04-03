#! /usr/bin/env node
//npm install pg

var pg = require('pg');

var conString = "postgres://blacksburg_read:nrv@postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com/blacksburg";

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  client.query('SELECT $1::int AS number', ['1'], function(err, result) {
    //call `done()` to release the client back to the pool
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log(result.rows[0].number);
    //output: 1
    client.end();
  });
});

//Get all of the sidewalk segments
//SELECT gid, layer, length, (ST_DumpPoints(geom)).path as path, ST_AsGeoJSON((ST_DumpPoints(geom)).geom) FROM sidewalks;

//Parse that into a structured array with one row for each gid

//for each gid
//for each point in the gid
//SELECT *, ST_Distance(geom, ST_SetSRID(ST_MakePoint(10928119.708678,3601579.38718802), 2284)) AS distance1 FROM roads
//ORDER BY ST_Distance(geom, ST_SetSRID(ST_MakePoint(10928119.708678,3601579.38718802), 2284))
//LIMIT 1;
//Store the results in an array for each gid
//At the end of each gid determine if they all match a particular road (90%+ or whatever threshold)




//Flip it around: Does every point on a road have a sidewalk within 8m? Any that don't but have a sidewalk associated with them should be flagged for review
