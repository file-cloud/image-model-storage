
var uploader = require('file-cloud-uploader');
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var async = require('async');
var http = require('http');
var https = require('https');

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
  _onDirCreated: function (res, type, cb) {
    return function (err, dirPath) {
      if (err) {
        cb(true, err);
        return;
      }
      var filename = new Date().getTime() + '.' + type[1];
      var tempName = path.join(dirPath, filename);
      var file = fs.createWriteStream(tempName);
      res.pipe(file);
      file.on('finish', function () {
        // close() is async, call cb after close completes.
        file.close(function () {
          cb(false, tempName);
        });
      });
    };
  },
  _onDownloadFinish: function (cb) {
    var self = this;
    return function (res) {
      if (res.statusCode !== 200) {
        return cb(true, 'Response status: ' + res.statusCode);
      }
      var type = res.headers['content-type'].split('/');
      if (!type[1]) {
        cb(true, type);
        return;
      }
      temp.track();
      temp.mkdir(dirName, self._onDirCreated(res, type, cb));
    };
  },
  _onDownloadError: function (cb) {
    return function (err) {
      // Delete the file async. (But we don't check the result)
      cb(true, err.message);
    };
  },
  _download: function (url, cb) {
    var sender = http;
    if (url.substring(0, 5) === 'https') {
      sender = https;
    }
    sender.get(url, this._onDownloadFinish(cb))
      .on('error', this._onDownloadError(cb));
  },
  _onFetchedUrl: function (models, url, config, cb) {
    var self = this;
    return function (error, filename) {
      if (error) {
        return cb(true, error);
      }
      var files = [{
        fd: filename
      }];
      self.save(models, files, config, function (error, results) {
        cb(false, results[0]);
      });
    };
  },
  saveUrl: function (models, url, config, cb) {
    this._download(url, this._onFetchedUrl(models, url, config, cb));
  }
};
