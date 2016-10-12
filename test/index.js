'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var validator = require('validator');
var imageModelStorage = require('../lib');

var config = require('./config');

var sailsMemoryAdapter = require('sails-memory');

var waterlineConfig = {
  adapters: {
    memory: sailsMemoryAdapter
  },

  connections: {
    default: {
      adapter: 'memory'
    }
  },
  defaults: {
    migrate: 'alter'
  }
};

var Waterline = require('waterline');
var waterline = new Waterline();
var connection = Waterline.Collection.extend({
  schema: true,
  identity: 'image',
  connection: 'default',
  attributes: {
    hash: {
      type: 'string',
      required: true,
      unique: true
    },
    url: {
      type: 'string',
      required: true
    }
  }
});
waterline.loadCollection(connection);

var models = {};
describe('image-model-storage', function () {
  it('should init waterline', function (done) {
    waterline.initialize(waterlineConfig, function (error, ontology) {
      if (error) {
        throw new Error('Waterline: ' + error);
      }
      models.Image = ontology.collections.image;
      assert(models.Image !== null);
      done();
    });
  });

  it('should be able to save files', function (done) {
    var files = [
      {
        fd: path.resolve(__dirname, './data/1.jpg')
      }, {
        fd: path.resolve(__dirname, './data/2.jpg')
      }
    ];
    imageModelStorage.save(models, files, config, function (error, results) {
      assert.equal(true, results.length === 2);
      for (var i = 0; i < results.length; i++) {
        var filename = results[i].hash + path.parse(results[i].url).ext;
        if (fs.existsSync(filename)) {
          fs.rename(filename, files[i].fd);
        }
      }
      done();
    });
  });

  it('should fetch url and save the file', function (done) {
    var url = 'https://www.baidu.com/img/bd_logo1.png';
    imageModelStorage.saveUrl(models, url, config, function (error, data) {
      assert.equal(true, !error);
      assert.equal(true, typeof data.hash === 'string');
      assert.equal(true, validator.isURL(data.url));
      assert.equal(true, typeof data.id === 'number');
      assert.equal(true, typeof data.hash === 'string');
      done();
    });
  });
  it('should fetch cdnified url and save the file', function (done) {
    var url = '  http://www.t1bao.com/images/logo.png';
    imageModelStorage.saveUrl(models, url, config, function (error, data) {
      assert.equal(true, !error);
      assert.equal(true, typeof data.hash === 'string');
      assert.equal(true, validator.isURL(data.url));
      assert.equal(true, typeof data.id === 'number');
      assert.equal(true, typeof data.hash === 'string');
      done();
    });
  });
  it('should fetch a more complicated url and save the file', function (done) {
    var url = 'http://wx.qlogo.cn/mmopen/PiajxSqBRaEK5ad1JqVK6qFcMTe0icWqIEu32CgWjtBSOV9yUyG7z0wLaywNbjTic7TNYibmRFkVKQhPSibJJtVZA7Q/0';
    imageModelStorage.saveUrl(models, url, config, function (error, data) {
      assert.equal(true, !error);
      assert.equal(true, typeof data.hash === 'string');
      assert.equal(true, validator.isURL(data.url));
      assert.equal(true, typeof data.id === 'number');
      done();
    });
  });

  it('should fail on _onFetchedUrl', function (done) {
    var cb = imageModelStorage._onFetchedUrl(null, null, null, function (error, data) {
      assert.equal(true, error);
      assert.equal(true, data === 'error');
      done();
    });
    cb('error', 'something');
  });

  it('should fail on _onDirCreated', function (done) {
    var cb = imageModelStorage._onDirCreated(null, null, function (error, data) {
      assert.equal(true, error);
      assert.equal(true, data === 'error');
      done();
    });
    cb('error');
  });

  it('should fail on _onDownloadError', function (done) {
    var cb = imageModelStorage._onDownloadError(function (error, data) {
      assert.equal(true, error);
      assert.equal(true, data === 'error');
      done();
    });
    cb({
      message: 'error'
    });
  });

  it('should fail on _onDownloadFinish', function (done) {
    var cb = imageModelStorage._onDownloadFinish(function (error, data) {
      assert.equal(true, error);
      assert.equal(true, data.length === 1);
      done();
    });
    cb({
      statusCode: 200,
      headers: {
        'content-type': ''
      }
    });
  });

  it('should fail on _onDownloadFinish', function (done) {
    var cb = imageModelStorage._onDownloadFinish(function (error, data) {
      assert.equal(true, error);
      assert.equal(true, data.indexOf('Response status: ') !== -1);
      done();
    });
    cb({
      statusCode: 100,
      headers: {
        'content-type': ''
      }
    });
  });

  it('should fail on _onSave', function (done) {
    var cb = imageModelStorage._onSave(null, null, null, function (error) {
      assert.equal(null, error);
      done();
    });
    cb({
      error: 'error'
    });
  });

  it('should fail on _onFind', function (done) {
    var cb = imageModelStorage._onFind(null, null, null, function (error, image) {
      assert.equal(null, error);
      assert.equal(undefined, image);
      done();
    });
    cb(true);
  });

  it('should fail on _onFind', function (done) {
    var cb = imageModelStorage._onFind(null, null, null, function (error, image) {
      assert.equal(null, error);
      assert.equal('image', image);
      done();
    });
    cb(null, 'image');
  });

  it('should fail on _onCreated', function (done) {
    var cb = imageModelStorage._onCreated(function (error, image) {
      assert.equal(null, error);
      assert.equal(undefined, image);
      done();
    });
    cb(true);
  });

  it('should fail on _onCreated', function (done) {
    var cb = imageModelStorage._onCreated(function (error, image) {
      assert.equal(null, error);
      assert.equal('image', image);
      done();
    });
    cb(null, 'image');
  });
  it('should fail on _onCreated', function (done) {
    var cb = imageModelStorage._onCreated(function (error, image) {
      assert.equal(null, error);
      assert.equal(undefined, image);
      done();
    });
    cb(null);
  });
});
