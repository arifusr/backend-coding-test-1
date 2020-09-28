'use strict';

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

module.exports = (db) => {
    /**
     * @api {get} /health Request health information
     * @apiName GetHealth
     * @apiGroup Health
     *
     * @apiSuccess {String} Healthy Healthy status.
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     Healthy
     * 
     * @apiExample {curl} Example usage:
     *      curl -i http://localhost:8010/health
     */
    app.get('/health', (req, res) => res.send('Healthy'));

    /**
     * @api {post} /rides Create new ride information
     * @apiName PostRides
     * @apiGroup Rides
     * 
     * @api {post} /rides
     * @apiParam {Number} start_lat         Mandatory Start latitude of rider.
     * @apiParam {Number} start_long        Mandatory Start longtitude of rider.
     * @apiParam {Number} end_lat           Mandatory End latitude of rider.
     * @apiParam {Number} end_long          Mandatory End longtitude of rider.
     * @apiParam {String} rider_name        Mandatory Rider name.
     * @apiParam {String} driver_name       Mandatory Driver name.
     * @apiParam {String} driver_vehicle    Mandatory Driver vehicle.
     *
     *@apiExample {curl} Example usage:
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
     * @apiSuccess {String} Healthy Healthy status.
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     Healthy
     *
     */
    app.post('/rides', jsonParser, (req, res) => {
        const startLatitude = Number(req.body.start_lat);
        const startLongitude = Number(req.body.start_long);
        const endLatitude = Number(req.body.end_lat);
        const endLongitude = Number(req.body.end_long);
        const riderName = req.body.rider_name;
        const driverName = req.body.driver_name;
        const driverVehicle = req.body.driver_vehicle;

        if (startLatitude < -90 || startLatitude > 90 || startLongitude < -180 || startLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Start latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (endLatitude < -90 || endLatitude > 90 || endLongitude < -180 || endLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'End latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (typeof riderName !== 'string' || riderName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        if (typeof driverName !== 'string' || driverName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Driver name must be a non empty string'
            });
        }

        if (typeof driverVehicle !== 'string' || driverVehicle.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Driver vehicle must be a non empty string'
            });
        }

        var values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle];
        
        const result = db.run('INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)', values, function (err) {
            if (err) {
                return res.send({
                    error_code: 'SERVER_ERROR',
                    message: 'Unknown error'
                });
            }

            db.all('SELECT * FROM Rides WHERE rideID = ?', this.lastID, function (err, rows) {
                if (err) {
                    return res.send({
                        error_code: 'SERVER_ERROR',
                        message: 'Unknown error'
                    });
                }

                res.send(rows);
            });
        });
    });

    app.get('/rides', (req, res) => {
        db.all('SELECT * FROM Rides', function (err, rows) {
            if (err) {
                return res.send({
                    error_code: 'SERVER_ERROR',
                    message: 'Unknown error'
                });
            }

            if (rows.length === 0) {
                return res.send({
                    error_code: 'RIDES_NOT_FOUND_ERROR',
                    message: 'Could not find any rides'
                });
            }

            res.send(rows);
        });
    });

    app.get('/rides/:id', (req, res) => {
        db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`, function (err, rows) {
            if (err) {
                return res.send({
                    error_code: 'SERVER_ERROR',
                    message: 'Unknown error'
                });
            }

            if (rows.length === 0) {
                return res.send({
                    error_code: 'RIDES_NOT_FOUND_ERROR',
                    message: 'Could not find any rides'
                });
            }

            res.send(rows);
        });
    });

    return app;
};
