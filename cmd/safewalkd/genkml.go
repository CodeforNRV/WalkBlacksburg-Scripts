package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"text/template"

	_ "github.com/CodeforNRV/safe_walk_blacksburg/Godeps/_workspace/src/github.com/lib/pq"
)

type Coord struct {
	Lat, Lng float64
}

type Road struct {
	Name      string
	ColorRank string
	Coords    []Coord
}

// Reforms the geomerty Json into a []Coord's
func parseCoords(rawGeomJson string) []Coord {
	type coord []float64
	type geomJson struct {
		Coords [][]coord `json:"coordinates"`
	}

	var geom geomJson

	err := json.Unmarshal([]byte(rawGeomJson), &geom)
	if err != nil {
		log.Fatal(err)
	}

	var coords []Coord

	for _, coord := range geom.Coords[0] {
		coords = append(coords, Coord{
			Lat: coord[0],
			Lng: coord[1],
		})
	}

	return coords
}

const (
	Green  = "green"
	Yellow = "yellow"
	Red    = "red"
)

// Calculates a safety rating and returns it as a string of "green" or "yellow" or "red"
func calculateSafetyRating(hasSidewalks, hasStreetlights bool, speedlmt float64) string {
	var color string

	switch {
	case hasSidewalks && hasStreetlights:
		color = Green

	case hasSidewalks && !hasStreetlights:
		color = Yellow

	case !hasSidewalks && !hasStreetlights:
		color = Red

	case !hasSidewalks && hasStreetlights:
		switch {
		case speedlmt < 1:
			color = Red
		default:
			color = Red

		case speedlmt <= 25:
			color = Yellow
		}

	default:
		color = Red
	}

	return color
}

func kmlExecute(w io.Writer) error {
	db, err := sql.Open("postgres", "host=postgres1.ceipocejvkue.us-west-2.rds.amazonaws.com user=blacksburg_read dbname=blacksburg password=nrv")
	if err != nil {
		return err
	}
	defer db.Close()

	// Grab dataset
	// Uses PostGIS to transform the geometry from SRID 2284 ==> SRID 4326
	rows, err := db.Query("SELECT name, speedlmt, hassidewalks, hasstreetlights, ST_AsGeoJson(ST_Transform(geom,4326)) FROM roads")
	if err != nil {
		return err
	}
	defer rows.Close()

	roads := make([]Road, 0, 200)

	// Interate over each road
	//  - Calculating the safety rating as a color
	//  - Processing the geometry into type []Coord's
	for rows.Next() {
		var name string
		var speedlmt float64
		var hasSidewalks, hasStreetlights bool
		var rawGeomJson string

		err = rows.Scan(&name, &speedlmt, &hasSidewalks, &hasStreetlights, &rawGeomJson)
		if err != nil {
			return err
		}

		roads = append(roads, Road{
			Name:      name,
			ColorRank: calculateSafetyRating(hasSidewalks, hasStreetlights, speedlmt),
			Coords:    parseCoords(rawGeomJson),
		})
	}

	return kmltpl.Execute(w, kml{roads})
}

type kml struct {
	Roads []Road
}

var kmltpl = template.Must(template.New("kml").Parse(`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.1">
  <Document>
    <name>Safe Walk Blacksburg</name>
    <description>Streets of Blacksburg ranked by walking safety</description>

    <Style id="greenLine">
      <LineStyle>
        <color>ff009900</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <Style id="yellowLine">
      <LineStyle>
        <color>ff61f2f2</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <Style id="redLine">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>

	{{range .Roads}}
	<Placemark>
	  <name>{{.Name}}</name>
	  <styleUrl>#{{.ColorRank}}Line</styleUrl>
	  <LineString>
		<altitudeMode>relative</altitudeMode>

		<coordinates>
		{{range .Coords}}{{.Lat}}, {{.Lng}}, 0
		{{end}}</coordinates>

	  </LineString>
	</Placemark>
	{{end}}

  </Document>
</kml>
`))
