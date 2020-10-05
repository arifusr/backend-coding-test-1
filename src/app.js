const express = require('express')

const app = express()

const bodyParser = require('body-parser')

const jsonParser = bodyParser.json()
const Validator = require('jsonschema').Validator;
const validator = new Validator();
const ReqRiderSchema = require('../.schema/rides.req.json')



module.exports = (db) => {
  /**
     * @api {get} /health Request health information
     * @apiName GetHealth
     * @apiGroup Health
     *
     * @apiSuccess {String} Healthy Healthy status.
     *
     * @apiSuccessExample {String} Success-Response:
     *     HTTP/1.1 200 OK
     *     Healthy
     *
     * @apiExample {curl} Example usage:
     *      curl -i http://localhost:8010/health
     */
  app.get('/health', (req, res) => res.send('Healthy'))

  /**
     * @api {post} /rides Create new ride information
     * @apiName PostRides
     * @apiGroup Rides
     * @apiSchema (Body) {jsonschema=../.schema/rides.req.json} apiParam
     *
     * @apiExample {curl} Example usage:
     *     curl --location --request POST 'http://localhost:8010/rides' \
     *     --header 'Content-Type: application/json' \
     *     --data-raw '{
     *     "start_lat":0,
     *     "start_long":0,
     *     "end_lat":0,
     *     "end_long":0,
     *     "rider_name": "rider1",
     *     "driver_name":"driver1",
     *     "driver_vehicle":"driver_vehicle1"
     *     }'
     *
     * @apiSchema {jsonschema=../.schema/rides.res.json} apiSuccess
     *
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     [
     *      {
     *         "rideID": 1,
     *         "startLat": 0,
     *         "startLong": 0,
     *         "endLat": 0,
     *         "endLong": 0,
     *         "riderName": "rider1",
     *         "driverName": "driver1",
     *         "driverVehicle": "driver_vehicle1",
     *         "created": "2020-09-28 04:22:50"
     *      }
     *     ]
     *
     * @apiError UserNotFound The <code>id</code> of the User was not found
     */
  app.post('/rides', jsonParser, (req, res, next) => {
    const { errors } = validator.validate(req.body, ReqRiderSchema)
    if(errors.length) {
      const errorMessage = errors.reduce((t,v)=>{return t+`${v.property.replace('instance.','')} ${v.message}; `},"")
      console.log(errorMessage)
      return res.status(400).json({
        error_code: 'SERVER_ERROR',
        message: errorMessage
      })
    }
    return next()
  }, (req, res) => {
    const values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle]

    db.run('INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)', values, function (err) {
      if (err) {
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        })
      }

      db.all('SELECT * FROM Rides WHERE rideID = ?', this.lastID, (err, rows) => {
        if (err) {
          return res.send({
            error_code: 'SERVER_ERROR',
            message: 'Unknown error'
          })
        }

        res.send(rows)
      })
    })
  })

  app.get('/rides', (req, res) => {
    db.all('SELECT * FROM Rides', (err, rows) => {
      if (err) {
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        })
      }

      if (rows.length === 0) {
        return res.send({
          error_code: 'RIDES_NOT_FOUND_ERROR',
          message: 'Could not find any rides'
        })
      }

      res.send(rows)
    })
  })

  app.get('/rides/:id', (req, res) => {
    db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`, (err, rows) => {
      if (err) {
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        })
      }

      if (rows.length === 0) {
        return res.send({
          error_code: 'RIDES_NOT_FOUND_ERROR',
          message: 'Could not find any rides'
        })
      }

      res.send(rows)
    })
  })

  return app
}
