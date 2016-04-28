/* eslint space-before-function-paren: 0 */

var uploader = require('file-cloud-uploader');
var fs = require('fs');
var path = require('path');
var request = require('request');
var temp = require('temp');
var async = require('async');

var dirName = 'imageStorage';
module.exports = {
  save: function(models, files, config, next) {
    async.mapSeries(files, function(file, cb) {
      uploader(config.type, file.fd, config.config, function(data) {
        if (data.error) {
          console.error(data);
          cb(null);
        }
        var hash = path.parse(data.path).name;
        if (!data.url) {
          data.url = config.config.base + data.path;
        }
        models.Image.findOne({
          hash: hash
        }).exec(function(error, image) {
          if (error) {
            console.error(error, image);
            cb(null);
            return;
          }
          if (image) {
            cb(null, image);
            return;
          }
          models.Image.create({
            hash: hash,
            url: data.url
          }).exec(function(error, image) {
            if (error) {
              console.error(error, image);
              cb(null);
              return;
            }
            if (image) {
              cb(null, image);
              return;
            }
            cb(null);
          });
        });
      });
    }, function(error, results) {
      next(error, results);
    });
  },
  saveUrl: function(models, url, config, cb) {
    var helper = this;

    request(url).on('response', function(res) {
      var type = res.headers['content-type'].split('/');
      if (!type[1]) {
        cb(true, type);
        return;
      }
      var filename = new Date().getTime() + '.' + type[1];
      temp.track();
      temp.mkdir(dirName, function(err, dirPath) {
        if (err) {
          cb(true, err);
          return;
        }
        var tempName = path.join(dirPath, filename);
        request(url).pipe(fs.createWriteStream(tempName)).on('finish', function() {
          var files = [{
            fd: tempName
          }];
          helper.save(models, files, config, function(error, results) {
            cb(false, results[0]);
          });
        });
      });
    });
  }
};
