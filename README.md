# safe_walk_blacksburg
A hodgepodge of scripts to support the WalkBlacksburg app and data backend

An app designed to improve the safety of walking around Blacksburg, VA, 
particularly at night by showing routes that provide sidewalks and street lighting, 
and including historical crime data overlays.

safe_walk_blacksburg is currently a [deployable heroku web app](#heroku-deployment).

## Data sources
Street lighting and sidewalk data has come from the Town of Blacksburg [GIS Department](http://www.blacksburg.gov/Index.aspx?page=29).
Lightning and sidewalk data is being interatively processed and bound to
road segments stored in a postgres instance running on aws.

### TODO
Crime data will come from 
* VT Police Department [Crime Log PDFs](http://www.police.vt.edu/VTPD_v2.1/crime_logs.php)
* Town reports from [CrimeMapping.com](http://www.crimemapping.com/map.aspx?aid=36898f05-f44b-4778-8c73-27f88b794e0c), which the town uses to publish their data

# Heroku Deployment
This application can being deployed to heroku. The web server binary is located in
[cmd/safewalkd](cmd/safewalkd) directory and is a go binary. See the
[heroku go tutorial](https://devcenter.heroku.com/articles/getting-started-with-go#introduction)
to get started deploying `safewalkd`.

## Environment

`safewalkd` requires a few heroku config(environment) variables to be set.

### Postgres Settings

These vars are used to connect to the postgres instance that contains
the road segment dataset. They should be set with `heroku config:set NRV_PG_HOST=some.hostname.aws.amazon.com`.
See [genkml.go](cmd/safewalkd/genkml.go#L95) for how the variables are used
to build the database connection.

#### Required

```
NRV_PG_DBNAME
NRV_PG_DBPASS
NRV_PG_HOST
NRV_PG_USER
```

### Dyno's URL

The google maps api requires an overlay kml to be referenced
with an absolute URL, including protocol and hostname(`http[s]://host.name/`).
For `safewalkd` to have access to the hostname of its dyno, it must have
an env config value set to the hostname. The following bash command will set
this config var for your heroku dyno.

```bash
$ heroku config:set HEROKU_URL=$(heroku info -s | grep web_url | cut -d= -f2)
```
