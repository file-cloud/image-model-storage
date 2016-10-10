/* eslint space-before-function-paren: 0 */

var uploader = require('file-cloud-uploader');
var fs = require('fs');
var path = require('path');
var request = require('request');
var temp = require('temp');
var async = require('async');

var dirName = 'imageStorage';
module.exports = {
  _onCreated: function (cb) {
    return function (error, image) {
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
    };
  },
  _onFind: function (models, hash, data, cb) {
    var self = this;
    return function (error, image) {
      if (error) {
        console.error(error, image);
        return cb(null);
      }
      if (image) {
        cb(null, image);
        return;
      }
      models.Image.create({
        hash: hash,
        url: data.url
      }).exec(self._onCreated(cb));
    };
  },
  _onSave: function (models, files, config, cb) {
    var self = this;
    return function (data) {
      if (data.error) {
        console.error(data);
        return cb(null);
      }
      var hash = path.parse(data.path).name;
      if (!data.url) {
        data.url = config.config.base + data.path;
      }
      models.Image.findOne({
        hash: hash
      }).exec(self._onFind(models, hash, data, cb));
    };
  },
  save: function (models, files, config, next) {
    var self = this;
    async.mapSeries(files, function (file, cb) {
      uploader(config.type, file.fd, config.config, self._onSave(models, files, config, cb));
    }, function (error, results) {
      next(error, results);
    });
  },
  _onDownloaded: function (models, url, config, cb) {
    var self = this;
    return function (res) {
      var type = res.headers['content-type'].split('/');
      if (!type[1]) {
        cb(true, type);
        return;
      }
      temp.track();
      temp.mkdir(dirName, self._onDirCreated(url, type, self._onFileDetermined(models, url, config, cb)));
    };
  },
  _onFileDetermined: function (models, url, config, cb) {
    var self = this;
    return function (error, tempName) {
      if (error) {
        return cb(true, error);
      }
      request(url).pipe(fs.createWriteStream(tempName)).on('finish', function () {
        var files = [{
          fd: tempName
        }];
        self.save(models, files, config, function (error, results) {
          cb(false, results[0]);
        });
      });
    };
  },
  _onDirCreated: function (url, type, cb) {
    return function (err, dirPath) {
      if (err) {
        cb(true, err);
        return;
      }
      var filename = new Date().getTime() + '.' + type[1];
      var tempName = path.join(dirPath, filename);
      cb(false, tempName);
    };
  },
  saveUrl: function (models, url, config, cb) {
    request(url).on('response', this._onDownloaded(models, url, config, cb));
  }
};
