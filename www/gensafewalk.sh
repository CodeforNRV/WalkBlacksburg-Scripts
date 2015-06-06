#!/bin/bash

# install dependancies
go get -u github.com/lib/pq

go run genkml.go > safewalk.kml
