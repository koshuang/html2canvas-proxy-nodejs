var express = require('express');
var url = require('url');
var cors = require('cors');
var qs = require('qs');
var request = require('request');
var path = require("path");

module.exports = function() {
  var app = express.Router();

  function validUrl(req, res, next) {
    req.query = req.query || qs.parse(url.parse(req.url).query);
    if (req.query.url == null) {
      next(new Error("No url specified"));
    } else if (typeof(req.query.url) !== "string" || url.parse(req.query.url).host === null) {
      next(new Error("Invalid url specified: " + req.query.url))
    } else {
      next();
    }
  }

  app.use(cors());
  app.get('/', validUrl, function(req, res, next) {
    if (typeof(req.query.callback) === "string") {
      request({
        url: req.query.url,
        encoding: 'binary'
      }, function(error, response, body) {
        if (error) {
          return next(error);
        }
        res.jsonp({
          content: new Buffer(body, 'binary').toString('base64'),
          type: response.headers['content-type']
        });
      });
    } else {
      const r = req.pipe(request({
        url: req.query.url,
        headers: {
          'Cache-Control': 'no-cache'
        }
      }));
      r.on('error', function() {
        res.sendFile(path.join(path.resolve(__dirname), 'no-image.jpg'));
      }).on('response', function(response) {
        if (response.statusCode === 200) {
          const contentType = response.headers['content-type'];
          if (!contentType || contentType && contentType.indexOf('image') > -1) {
            r.pipe(res);
          } else {
            res.sendFile(path.join(path.resolve(__dirname), 'no-image.jpg'));
          }
        } else if (response.statusCode === 404) {
          res.sendFile(path.join(path.resolve(__dirname), 'no-image.jpg'));
        } else {
          r.pipe(res);
        }
      });
    }
  });

  return app;
};
