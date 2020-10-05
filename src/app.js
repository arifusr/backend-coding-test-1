const express = require('express')

const app = express()

const bodyParser = require('body-parser')

const jsonParser = bodyParser.json()
const Validator = require('jsonschema').Validator
const validator = new Validator()
const ReqRiderSchema = require('../.schema/rides.req.json')
const logger = require('./logger')
const Joi = require('joi')

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
     * 
     */
  app.post('/rides', jsonParser, (req, res, next) => {
    const { errors } = validator.validate(req.body, ReqRiderSchema)
    if (errors.length) {
      const errorMessage = errors.reduce((t, v) => { return t + `${v.property.replace('instance.', '')} ${v.message}; ` }, '')
      return res.send({
        error_code: 'VALIDATION_ERROR',
        message: errorMessage
      })
    }
    return next()
  }, (req, res) => {
    const values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle]

    db.run('INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)', values, function (err) {
      if (err) {
        logger.error(err.message)
        return res.send({
          error_code: 'SERVER_ERROR',
          message: 'Unknown error'
        })
      }

      db.all('SELECT * FROM Rides WHERE rideID = ?', this.lastID, (err, rows) => {
        if (err) {
          logger.error(err.message)
          return res.send({
            error_code: 'SERVER_ERROR',
            message: 'Unknown error'
          })
        }

        res.send(rows)
      })
    })
  })
 /**
     * @api {get} /rides get collection of Rides
     * @apiName GetRides
     * @apiGroup Rides
     * @apiParam {Number} limit limit pagination
     * @apiParam {Number} page specify page to display
     *
     * @apiExample {curl} Example usage:
     *     curl --location --request GET 'localhost:8010/rides?limit=2&page=-1'
     *
     * @apiSchema {jsonschema=../.schema/rides.res.json} apiSuccess
     *
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *        "page": "1",
     *        "total_page": 0.5,
     *        "data": [
     *            {
     *                "rideID": 1,
     *                "startLat": 20,
     *                "startLong": 3000,
     *                "endLat": 2,
     *                "endLong": 2,
     *                "riderName": "abc",
     *                "driverName": "2wee",
     *                "driverVehicle": "driver_vehicle1",
     *                "created": "2020-10-05 01:17:23"
     *            }
     *        ]
     *     }
     *
     * 
     */
  app.get('/rides', jsonParser, (req, res) => {
    const schema = Joi.object({
      limit: Joi.number().positive(),
      page: Joi.number().positive()
    })
    const { error } = schema.validate(req.query)
    if(error) return res.send({
      error_ode: 'VALIDATION_ERROR',
      message: error.message
    })
    const limit = req.query.limit ? `limit ${req.query.limit}`:'';
    const skip = req.query.page ? `offset ${req.query.limit * (req.query.page -1)}`:''
    db.all(`SELECT * FROM Rides ${limit} ${skip}`, (err, rows) => {
      if (err) {
        logger.error(err.message)
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
      const paginate = rows;

      db.all(`SELECT * FROM Rides`,(err, rows)=>{
        if (err) {
          logger.error(err.message)
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
        res.send({
          page: req.query.page,
          total_page: rows.length / req.query.limit,
          data: paginate
        })
      })
      
    })
  })

  app.get('/rides/:id', (req, res) => {
    db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`, (err, rows) => {
      if (err) {
        logger.error(err.message)
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
